package com.healthclear.tests;
import android.app.*;
import android.content.*;
import android.os.*;
import android.view.*;
import android.webkit.WebView;
import java.io.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
public class SmokeInstrumentation extends Instrumentation {
 private Activity activity; private WebView web; private boolean diagnostic,uiOnly;
 @Override public void onCreate(Bundle args){super.onCreate(args);diagnostic=args!=null&&"true".equals(args.getString("diagnostic"));uiOnly=args!=null&&"true".equals(args.getString("uiOnly"));start();}
 private WebView find(View v){if(v instanceof WebView)return (WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=find(g.getChildAt(i));if(w!=null)return w;}}return null;}
 private String eval(String code)throws Exception {CountDownLatch done=new CountDownLatch(1);AtomicReference<String> out=new AtomicReference<>();runOnMainSync(()->web.evaluateJavascript(code,s->{out.set(s);done.countDown();}));if(!done.await(12,TimeUnit.SECONDS))throw new Exception("JavaScript callback timed out");return out.get();}
 private void expect(String expression,String name)throws Exception {long until=System.currentTimeMillis()+20000;while(System.currentTimeMillis()<until){if("true".equals(eval(expression))){Bundle progress=new Bundle();progress.putString("stream","CHECK: "+name+"\n");sendStatus(1,progress);return;}Thread.sleep(250);}throw new Exception("Failed: "+name);}
 private void step(String code)throws Exception {eval(code);}
 @Override public void onStart(){Bundle results=new Bundle();try{
  Intent intent=new Intent();intent.setClassName("com.healthclear.app","com.healthclear.app.MainActivity");intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);activity=startActivitySync(intent);runOnMainSync(()->web=find(activity.getWindow().getDecorView()));if(web==null)throw new Exception("No WebView");
  if(diagnostic){
   StringBuilder errors=new StringBuilder();
   runOnMainSync(()->web.setWebChromeClient(new android.webkit.WebChromeClient(){@Override public boolean onConsoleMessage(android.webkit.ConsoleMessage message){synchronized(errors){errors.append(message.message()).append(" @ ").append(message.sourceId()).append(":").append(message.lineNumber()).append("\n");}return true;}}));
   step("location.reload()");Thread.sleep(3000);
   step("window.__hcProbe='pending';fetch('https://appassets.androidplatform.net/assets/app.js').then(async r=>window.__hcProbe=JSON.stringify({status:r.status,type:r.headers.get('content-type'),length:(await r.text()).length})).catch(e=>window.__hcProbe=String(e))");
   expect("window.__hcProbe!=='pending'","asset response diagnostic");
   String state=eval("JSON.stringify({ready:document.readyState,origin:location.origin,theme:document.documentElement.dataset.theme,children:document.querySelector('#app')?.children.length,native:typeof HealthClearAndroid,api:typeof healthclearApiResponse,probe:window.__hcProbe,scripts:[...document.scripts].map(s=>({src:s.src,type:s.type})),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,status:r.responseStatus,size:r.decodedBodySize}))})");
   StringBuilder assets=new StringBuilder();for(String file:new String[]{"app.js","locale-en.js","locale-hi.js","locale-te.js"}){try(InputStream stream=activity.getAssets().open(file)){assets.append(file).append(": ").append(stream.available()).append(" bytes\n");}catch(Exception ex){assets.append(file).append(": ").append(ex.getClass().getSimpleName()).append("\n");}}
   results.putString("stream",state+"\nASSETS: "+assets+"\nCONSOLE: "+errors.toString()+"\n");finish(Activity.RESULT_OK,results);return;
  }
  expect("!!document.querySelector('[data-sample=blood]')","upload screen");
  expect("document.documentElement.scrollWidth<=window.innerWidth+2","mobile layout does not overflow");
  step("document.querySelector('[data-sample=blood]').click()");
  expect("!!document.querySelector('#extracted')","review screen");
  step("document.querySelector('#continue').click()");expect("document.querySelector('#review-error').textContent.length>0","verification gate");
  step("document.querySelector('#verified').checked=true;document.querySelector('#continue').click()");
  expect("!!document.querySelector('#explanation')","explanation screen");
  step("document.querySelector('[data-source]').click()");expect("!!document.querySelector('.highlight')","source link");
  step("document.querySelector('#language').value='hi';document.querySelector('#language').dispatchEvent(new Event('change'))");expect("document.querySelector('#explanation').lang==='hi'","Hindi explanation");
  step("document.querySelector('#language').value='te';document.querySelector('#language').dispatchEvent(new Event('change'))");expect("document.querySelector('#explanation').lang==='te'","Telugu explanation");
  step("document.querySelector('#save').click();document.querySelector('[data-nav=history]').click()");expect("!!document.querySelector('[data-open]')","encrypted history saved");
  String encrypted=getTargetContext().getSharedPreferences("encrypted_reports",0).getString("history","");if(encrypted.contains("blood")||encrypted.isEmpty())throw new Exception("History not encrypted");
  step("document.querySelector('[data-open]').click()");expect("!!document.querySelector('#explanation')","history reopen");
  step("document.querySelector('[data-nav=settings]').click()");expect("document.body.textContent.includes('Punit Badyal')","developer section");
  if(uiOnly){results.putString("stream","PASS: upload, responsive width, verification gate, explanations, sources, Hindi/Telugu, encrypted history and developer section. Offline UI only; no provider service used.\n");finish(Activity.RESULT_OK,results);return;}
  step("document.querySelector('#backend-url').value='http://127.0.0.1:8080';document.querySelector('#backend-token').value='test-only-fixture-token-12345678901234567890';document.querySelector('#connect').dispatchEvent(new Event('submit',{cancelable:true}))");
  expect("document.querySelector('#connection-message').textContent.includes('configured')","native backend connection");
  step("document.querySelector('[data-nav=upload]').click();document.querySelector('#consent').checked=true;window.healthclearReceiveFile('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXc8AAAAASUVORK5CYII=','fictional-test.png','image/png',0)");
  expect("document.querySelector('#extracted')?.value.includes('10.8')","OCR response (mock provider)");
  step("document.querySelector('#verified').checked=true;document.querySelector('#continue').click()");expect("!!document.querySelector('#explanation')","live adapter explanation (mock provider)");
  expect("document.querySelector('#explanation').textContent.includes('10.8 g/dL')","exact source values shown");
  step("document.querySelectorAll('[data-question]')[3].click()");expect("document.querySelector('#answer').textContent.includes('clinician')","grounded chat (mock provider)");
  step("document.querySelector('#save').click();document.querySelector('[data-nav=history]').click()");expect("document.body.textContent.includes('fictional-test.png')","personal history saved encrypted");
  if(getTargetContext().getSharedPreferences("encrypted_reports",0).getString("history","").contains("Hemoglobin"))throw new Exception("Plaintext medical content in history");
  step("document.querySelector('[data-nav=upload]').click()");
  results.putString("stream","PASS: upload, responsive width, review verification, explanation, source links, Hindi/Telugu, encrypted history, developer section, native HTTP test connection, OCR/explanation/chat adapters using a labelled mock provider.\n");finish(Activity.RESULT_OK,results);
 }catch(Exception e){results.putString("stream","FAIL: "+e.getMessage()+"\n");finish(Activity.RESULT_CANCELED,results);}}
}
