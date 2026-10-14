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
 private Activity activity; private WebView web;
 @Override public void onCreate(Bundle args){super.onCreate(args);start();}
 private WebView find(View v){if(v instanceof WebView)return (WebView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){WebView w=find(g.getChildAt(i));if(w!=null)return w;}}return null;}
 private String eval(String code)throws Exception {CountDownLatch done=new CountDownLatch(1);AtomicReference<String> out=new AtomicReference<>();runOnMainSync(()->web.evaluateJavascript(code,s->{out.set(s);done.countDown();}));if(!done.await(12,TimeUnit.SECONDS))throw new Exception("JavaScript callback timed out");return out.get();}
 private void expect(String expression,String name)throws Exception {long until=System.currentTimeMillis()+20000;while(System.currentTimeMillis()<until){if("true".equals(eval(expression))){Bundle progress=new Bundle();progress.putString("stream","CHECK: "+name+"\n");sendStatus(1,progress);return;}Thread.sleep(250);}throw new Exception("Failed: "+name);}
 private void step(String code)throws Exception {eval(code);}
 @Override public void onStart(){Bundle results=new Bundle();try{
  Intent intent=new Intent();intent.setClassName("com.healthclear.app","com.healthclear.app.MainActivity");intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);activity=startActivitySync(intent);runOnMainSync(()->web=find(activity.getWindow().getDecorView()));if(web==null)throw new Exception("No WebView");
  expect("!!document.querySelector('[data-sample=blood]')","upload screen");
  expect("document.documentElement.scrollWidth<=window.innerWidth+2","mobile layout does not overflow");
  step("document.querySelector('[data-sample=blood]').click()");
  expect("!!document.querySelector('#extracted')","review screen");
  step("document.querySelector('#continue').click()");expect("document.querySelector('#review-error').textContent.includes('Verify')","verification gate");
  step("document.querySelector('#verified').checked=true;document.querySelector('#continue').click()");
  expect("!!document.querySelector('#explanation')","explanation screen");
  step("document.querySelector('[data-source]').click()");expect("!!document.querySelector('.highlight')","source link");
  step("document.querySelector('#language').value='hi';document.querySelector('#language').dispatchEvent(new Event('change'))");expect("document.querySelector('#explanation').lang==='hi'","Hindi explanation");
  step("document.querySelector('#language').value='te';document.querySelector('#language').dispatchEvent(new Event('change'))");expect("document.querySelector('#explanation').lang==='te'","Telugu explanation");
  step("document.querySelector('#save').click();document.querySelector('[data-nav=history]').click()");expect("!!document.querySelector('[data-open]')","encrypted history saved");
  String encrypted=getTargetContext().getSharedPreferences("encrypted_reports",0).getString("history","");if(encrypted.contains("blood")||encrypted.isEmpty())throw new Exception("History not encrypted");
  step("document.querySelector('[data-open]').click()");expect("!!document.querySelector('#explanation')","history reopen");
  step("document.querySelector('[data-nav=settings]').click()");expect("document.body.textContent.includes('Punit Badyal')","developer section");
  step("document.querySelector('#backend-url').value='http://127.0.0.1:8080';document.querySelector('#backend-token').value='test-only-fixture-token-12345678901234567890';document.querySelector('#connect').dispatchEvent(new Event('submit',{cancelable:true}))");
  expect("document.querySelector('#connection-message').textContent.includes('Connected.')","native backend connection");
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
