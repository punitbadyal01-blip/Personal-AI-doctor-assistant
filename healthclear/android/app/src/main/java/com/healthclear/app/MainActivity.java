package com.healthclear.app;

import android.app.Activity;
import android.content.*;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.*;
import android.provider.*;
import android.speech.tts.*;
import android.view.*;
import android.webkit.*;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private static final int PICK=10,CAMERA=11,EXPORT=12,MAX=10*1024*1024;
 private WebView web;
 private boolean googleSignInPending=false;
 private long googleSignInStarted=0;
 private TextToSpeech tts;
 private boolean ttsReady=false,paused=false;
 private String spoken="",exportText="",speechLanguage="en";
 private int spokenOffset=0,utteranceOffset=0,speechGeneration=0;
 private float speechRate=1f;
 private PdfRenderer pdf;
 private Uri cameraUri;
 private int fileGeneration=0;
 private final java.util.concurrent.ExecutorService worker=java.util.concurrent.Executors.newSingleThreadExecutor();
 @Override public void onCreate(Bundle state){super.onCreate(state);cleanTemporaryFiles();
  web=new WebView(this);web.setBackgroundColor(Color.rgb(250,251,248));setContentView(web);
  web.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());}return insets;});
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setCacheMode(WebSettings.LOAD_NO_CACHE);
  CookieManager.getInstance().setAcceptCookie(false);
  web.setWebViewClient(new WebViewClient(){
   @Override public void onPageFinished(WebView v,String url){if((ORIGIN+"/assets/index.html").equals(url))handleGoogleCallback(getIntent());}
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){Uri u=request.getUrl();if(request.isForMainFrame()&&"https://github.com/punitbadyal01-blip".equals(u.toString())){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(ActivityNotFoundException e){message("No browser is available. Visit github.com/punitbadyal01-blip on another device.");}return true;}return !ORIGIN.equals(u.getScheme()+"://"+u.getHost());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){Uri u=r.getUrl();if("https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())){String p=u.getPath();if(p!=null&&p.startsWith("/assets/")&&!p.contains("..")){String file=p.substring(8);if(Arrays.asList("index.html","app.js","services.js","style.css","api.js").contains(file))try{String type=file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":"text/javascript";return new WebResourceResponse(type,"UTF-8",getAssets().open(file));}catch(IOException ignored){}}}return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
  });
  web.addJavascriptInterface(new Bridge(),"HealthClearAndroid");
  tts=new TextToSpeech(this,status->{ttsReady=status==TextToSpeech.SUCCESS;});
  tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){} public void onDone(String id){runOnUiThread(()->{if(speechMatches(id)&&id.endsWith(":last")){spokenOffset=0;audioStatus("Finished");}});}public void onError(String id){runOnUiThread(()->{if(speechMatches(id))audioStatus("Audio could not play. Please retry.");});}public void onRangeStart(String id,int start,int end,int frame){runOnUiThread(()->{if(speechMatches(id))spokenOffset=Integer.parseInt(id.split(":")[1])+start;});}});
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->js("window.healthclearAndroidBack?.()"));
  web.loadUrl(ORIGIN+"/assets/index.html");
 }
 private void js(String script){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())web.evaluateJavascript(script,null);});}
 private void message(String text){js("window.healthclearNativeError?.("+JSONObject.quote(text)+")");}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleGoogleCallback(intent);}
 private void googleResult(String code,String error){js("window.healthclearGoogleReturn?.("+JSONObject.quote(code)+","+JSONObject.quote(error)+")");}
 private void handleGoogleCallback(Intent intent){
  Uri u=intent==null?null:intent.getData();
  if(u==null||!"com.healthclear.app".equals(u.getScheme())||!"auth".equals(u.getHost())||!"/callback".equals(u.getPath())||u.getPort()!=-1||u.getUserInfo()!=null)return;
  intent.setData(null);
  boolean pending=googleSignInPending&&SystemClock.elapsedRealtime()-googleSignInStarted<600000;googleSignInPending=false;
  if(!pending){googleResult("","Sign-in expired or interrupted. Start Google sign-in again.");return;}
  if(u.getFragment()!=null||u.getQueryParameter("error")!=null){googleResult("","Google sign-in was cancelled or could not finish. Please retry.");return;}
  String code=u.getQueryParameter("code");
  if(code==null||!code.matches("[A-Za-z0-9_-]{10,2048}")){googleResult("","Invalid sign-in callback. Please retry.");return;}
  googleResult(code,"");
 }
 private boolean speechMatches(String id){return id!=null&&id.startsWith(speechGeneration+":");}
 private int queueSpeech(){int offset=spokenOffset;boolean first=true;while(offset<spoken.length()){int end=Math.min(spoken.length(),offset+2500);if(end<spoken.length()){int boundary=spoken.lastIndexOf('\n',end);if(boundary>offset+200)end=boundary+1;else{boundary=spoken.lastIndexOf(' ',end);if(boundary>offset+200)end=boundary+1;}}String id=speechGeneration+":"+offset+(end==spoken.length()?":last":"");int status=tts.speak(spoken.substring(offset,end),first?TextToSpeech.QUEUE_FLUSH:TextToSpeech.QUEUE_ADD,null,id);if(status!=TextToSpeech.SUCCESS)return status;first=false;offset=end;}return TextToSpeech.SUCCESS;}
 private void audioStatus(String text){js("window.healthclearAudioStatus?.("+JSONObject.quote(text)+")");}
 private void cleanTemporaryFiles(){for(String n:new String[]{"capture.jpg","report.pdf"})new File(getCacheDir(),n).delete();}
 private void releaseReport(){fileGeneration++;if(pdf!=null){pdf.close();pdf=null;}cleanTemporaryFiles();}
 private boolean isDevelopment(){return (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0;}
 public final class Bridge {
  @JavascriptInterface public void openGoogleSignIn(String address){runOnUiThread(()->{
   try{
    Uri u=Uri.parse(address);String challenge=u.getQueryParameter("code_challenge");
    if(!"https".equals(u.getScheme())||u.getHost()==null||!u.getHost().matches("[a-z0-9-]+\\.supabase\\.co")||u.getPort()!=-1||u.getUserInfo()!=null||u.getFragment()!=null||!"/auth/v1/authorize".equals(u.getPath())||!"google".equals(u.getQueryParameter("provider"))||!"com.healthclear.app://auth/callback".equals(u.getQueryParameter("redirect_to"))||!"s256".equals(u.getQueryParameter("code_challenge_method"))||challenge==null||!challenge.matches("[A-Za-z0-9_-]{43}"))throw new IllegalArgumentException();
    googleSignInPending=true;googleSignInStarted=SystemClock.elapsedRealtime();
    Intent browser=new Intent(Intent.ACTION_VIEW,u);browser.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(browser);
   }catch(ActivityNotFoundException e){googleSignInPending=false;googleResult("","No browser is available for Google sign-in. Install a browser or use email sign-in.");}
   catch(Exception e){googleSignInPending=false;googleResult("","Could not start secure Google sign-in. Please retry.");}
  });}
  @JavascriptInterface public void cancelGoogleSignIn(){runOnUiThread(()->googleSignInPending=false);}
  @JavascriptInterface public boolean localDevelopment(){return isDevelopment();}
  @JavascriptInterface public String getHistory(){return SecureStore.read(MainActivity.this);}
  @JavascriptInterface public boolean saveHistory(String json){return SecureStore.save(MainActivity.this,json);}
  @JavascriptInterface public boolean clearHistory(){return SecureStore.clear(MainActivity.this);}
  @JavascriptInterface public void request(String id,String origin,String token,String route,String body){
   if(!id.matches("[0-9]{1,10}")||body.length()>15000000)return;
   worker.execute(()->{int status=502;String response="{\"error\":\"Could not connect securely to the backend. Check Settings and retry.\"}";
    java.net.HttpURLConnection connection=null;
    try{java.net.URI base=new java.net.URI(origin);boolean local=isDevelopment()&&origin.equals("http://127.0.0.1:8080");if((!"https".equals(base.getScheme())&&!local)||base.getHost()==null||base.getRawUserInfo()!=null||base.getRawQuery()!=null||base.getRawFragment()!=null||!(base.getPath().isEmpty()||base.getPath().equals("/"))||!Arrays.asList("status","ocr","explain","chat","cloud").contains(route)||token.length()<32||token.contains("\n")||token.contains("\r"))throw new IOException();
     connection=(java.net.HttpURLConnection)new java.net.URL(origin+"/v1/"+route).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(100000);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Authorization","Bearer "+token);
     byte[] bytes=body.getBytes(StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=connection.getOutputStream()){out.write(bytes);}status=connection.getResponseCode();
     try(InputStream in=status>=200&&status<300?connection.getInputStream():connection.getErrorStream()){if(in==null)throw new IOException();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1){if(out.size()+count>1048576)throw new IOException();out.write(buffer,0,count);}response=out.toString("UTF-8");}
    }catch(Exception e){status=502;}finally{if(connection!=null)connection.disconnect();}
    js("window.healthclearApiResponse?.("+JSONObject.quote(id)+","+status+","+JSONObject.quote(response)+")");
   });
  }

  @JavascriptInterface public void finishApp(){runOnUiThread(()->finish());}
  @JavascriptInterface public void pickFile(boolean camera){runOnUiThread(()->{try{if(camera){cameraUri=Uri.parse("content://com.healthclear.app.camera/capture.jpg");Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);i.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);i.setClipData(ClipData.newRawUri("Camera report",cameraUri));i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(i,CAMERA);}else{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","application/pdf"});startActivityForResult(i,PICK);}}catch(ActivityNotFoundException e){message(camera?"No camera app is available. Choose an image or PDF instead.":"No document picker is available on this device.");}});}
  @JavascriptInterface public void closeReport(){runOnUiThread(()->releaseReport());}
  @JavascriptInterface public void pdfPage(int page){runOnUiThread(()->renderPdf(page));}
  @JavascriptInterface public void speak(String text,String language,float rate,boolean replay){runOnUiThread(()->{if(!ttsReady){audioStatus("Device speech is still starting or is unavailable. Please try again.");return;}if(text.length()>100000){audioStatus("This explanation is too long for audio.");return;}Locale locale=Locale.forLanguageTag(language);Voice selected=null;if(tts.getVoices()!=null)for(Voice v:tts.getVoices())if(v.getLocale().getLanguage().equals(locale.getLanguage())&&!v.isNetworkConnectionRequired()){selected=v;break;}if(selected==null){audioStatus("No offline "+language+" voice is installed. Install a matching voice in Android text-to-speech settings.");return;}boolean resume=paused&&!replay&&spoken.equals(text)&&speechLanguage.equals(language);if(!resume)spokenOffset=0;tts.stop();tts.setVoice(selected);speechRate=Math.max(.5f,Math.min(rate,2f));tts.setSpeechRate(speechRate);spoken=text;speechLanguage=language;paused=false;utteranceOffset=spokenOffset;++speechGeneration;int status=queueSpeech();audioStatus(status==TextToSpeech.SUCCESS?"Playing - Offline Android voice":"Audio could not play. Please retry.");});}
  @JavascriptInterface public void pause(){runOnUiThread(()->{paused=true;++speechGeneration;tts.stop();audioStatus("Paused. Play resumes from the current word when supported by the speech engine.");});}
  @JavascriptInterface public void stop(){runOnUiThread(()->{paused=false;spokenOffset=0;++speechGeneration;if(tts!=null)tts.stop();});}
  @JavascriptInterface public void exportSummary(String text){if(text.length()>100000)return;runOnUiThread(()->{exportText=text;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("text/plain");i.putExtra(Intent.EXTRA_TITLE,"HealthClear-doctor-summary.txt");try{startActivityForResult(i,EXPORT);}catch(ActivityNotFoundException e){message("No file-saving app is available.");}});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK){if(request==CAMERA)new File(getCacheDir(),"capture.jpg").delete();if(request==EXPORT)exportText="";return;}if(request==EXPORT){try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new IOException();stream.write(exportText.getBytes(StandardCharsets.UTF_8));message("Summary saved to your chosen location.");}catch(Exception e){message("The summary could not be saved. Please retry.");}finally{exportText="";}return;}if(request!=PICK&&request!=CAMERA)return;Uri uri=request==CAMERA?cameraUri:(data==null?null:data.getData());if(uri==null)return;final int generation=++fileGeneration;message("Opening your report...");worker.execute(()->readReport(uri,generation,request==CAMERA));}
 private void readReport(Uri uri,int generation,boolean camera){try{
  String name=camera?"camera-report.jpg":"Report";String type=camera?"image/jpeg":getContentResolver().getType(uri);
  try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())name=c.getString(0);}
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=getContentResolver().openInputStream(uri)){if(in==null)throw new IOException();byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1){if(bytes.size()+count>MAX)throw new IOException("size");bytes.write(buffer,0,count);}}
  byte[] raw=bytes.toByteArray();if(raw.length==0)throw new IOException();String encoded=android.util.Base64.encodeToString(raw,android.util.Base64.NO_WRAP);String finalName=name,finalType=type;
  runOnUiThread(()->{if(generation!=fileGeneration)return;try{if(pdf!=null){pdf.close();pdf=null;}new File(getCacheDir(),"report.pdf").delete();if("application/pdf".equals(finalType)){File f=new File(getCacheDir(),"report.pdf");try(FileOutputStream out=new FileOutputStream(f)){out.write(raw);}pdf=new PdfRenderer(ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY));}js("window.healthclearReceiveFile?.("+JSONObject.quote(encoded)+","+JSONObject.quote(finalName)+","+JSONObject.quote(finalType==null?"":finalType)+","+(pdf==null?0:pdf.getPageCount())+")");}catch(Exception e){releaseReport();message("This PDF could not be read. Use an unlocked PDF or clear photos of the written report.");}finally{new File(getCacheDir(),"capture.jpg").delete();revokeUriPermission(uri,Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);}});
 }catch(Exception e){runOnUiThread(()->{if(generation==fileGeneration){new File(getCacheDir(),"capture.jpg").delete();message("Could not open the report. Choose a readable JPG, PNG, or PDF up to 10 MB.");}});}}
 private void renderPdf(int index){if(pdf==null||index<0||index>=pdf.getPageCount())return;try(PdfRenderer.Page p=pdf.openPage(index)){float scale=Math.min(1.5f,1200f/Math.max(p.getWidth(),p.getHeight()));Bitmap bitmap=Bitmap.createBitmap(Math.max(1,(int)(p.getWidth()*scale)),Math.max(1,(int)(p.getHeight()*scale)),Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);p.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);ByteArrayOutputStream out=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.PNG,100,out);bitmap.recycle();js("window.healthclearPdfPage?.("+JSONObject.quote("data:image/png;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP))+","+index+","+pdf.getPageCount()+")");}catch(Exception e){message("This PDF page could not be rendered. Please try another page or a clearer copy.");}}
 @Override public void onBackPressed(){js("window.healthclearAndroidBack?.()");}
 @Override protected void onPause(){super.onPause();if(tts!=null&&tts.isSpeaking()){paused=true;++speechGeneration;tts.stop();audioStatus("Paused while the app is in the background.");}}
 @Override protected void onDestroy(){releaseReport();worker.shutdownNow();if(tts!=null){tts.stop();tts.shutdown();}if(web!=null){web.removeJavascriptInterface("HealthClearAndroid");web.destroy();}super.onDestroy();}
}
