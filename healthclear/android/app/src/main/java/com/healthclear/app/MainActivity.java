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
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){Uri u=request.getUrl();return !ORIGIN.equals(u.getScheme()+"://"+u.getHost());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){Uri u=r.getUrl();if("https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())){String p=u.getPath();if(p!=null&&p.startsWith("/assets/")&&!p.contains("..")){String file=p.substring(8);if(Arrays.asList("index.html","app.js","services.js","style.css").contains(file))try{String type=file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":"text/javascript";return new WebResourceResponse(type,"UTF-8",getAssets().open(file));}catch(IOException ignored){}}}return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
  });
  web.addJavascriptInterface(new Bridge(),"HealthClearAndroid");
  tts=new TextToSpeech(this,status->{ttsReady=status==TextToSpeech.SUCCESS;});
  tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){} public void onDone(String id){runOnUiThread(()->{if(id.equals(Integer.toString(speechGeneration))){spokenOffset=0;audioStatus("Finished");}});}public void onError(String id){runOnUiThread(()->{if(id.equals(Integer.toString(speechGeneration)))audioStatus("Audio could not play. Please retry.");});}public void onRangeStart(String id,int start,int end,int frame){runOnUiThread(()->{if(id.equals(Integer.toString(speechGeneration)))spokenOffset=utteranceOffset+start;});}});
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->js("window.healthclearAndroidBack?.()"));
  web.loadUrl(ORIGIN+"/assets/index.html");
 }
 private void js(String script){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())web.evaluateJavascript(script,null);});}
 private void message(String text){js("window.healthclearNativeError?.("+JSONObject.quote(text)+")");}
 private void audioStatus(String text){js("window.healthclearAudioStatus?.("+JSONObject.quote(text)+")");}
 private void cleanTemporaryFiles(){for(String n:new String[]{"capture.jpg","report.pdf"})new File(getCacheDir(),n).delete();}
 private void releaseReport(){fileGeneration++;if(pdf!=null){pdf.close();pdf=null;}cleanTemporaryFiles();}
 public final class Bridge {
  @JavascriptInterface public void finishApp(){runOnUiThread(()->finish());}
  @JavascriptInterface public void pickFile(boolean camera){runOnUiThread(()->{try{if(camera){cameraUri=Uri.parse("content://com.healthclear.app.camera/capture.jpg");Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);i.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);i.setClipData(ClipData.newRawUri("Camera report",cameraUri));i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(i,CAMERA);}else{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","application/pdf"});startActivityForResult(i,PICK);}}catch(ActivityNotFoundException e){message(camera?"No camera app is available. Choose an image or PDF instead.":"No document picker is available on this device.");}});}
  @JavascriptInterface public void closeReport(){runOnUiThread(()->releaseReport());}
  @JavascriptInterface public void pdfPage(int page){runOnUiThread(()->renderPdf(page));}
  @JavascriptInterface public void speak(String text,String language,float rate,boolean replay){runOnUiThread(()->{if(!ttsReady){audioStatus("Device speech is still starting or is unavailable. Please try again.");return;}if(text.length()>TextToSpeech.getMaxSpeechInputLength()){audioStatus("This explanation is too long for the installed speech engine.");return;}Locale locale=Locale.forLanguageTag(language);Voice selected=null;if(tts.getVoices()!=null)for(Voice v:tts.getVoices())if(v.getLocale().getLanguage().equals(locale.getLanguage())&&!v.isNetworkConnectionRequired()){selected=v;break;}if(selected==null){audioStatus("No offline "+language+" voice is installed. Install a matching voice in Android text-to-speech settings.");return;}boolean resume=paused&&!replay&&spoken.equals(text)&&speechLanguage.equals(language);if(!resume)spokenOffset=0;tts.stop();tts.setVoice(selected);speechRate=Math.max(.5f,Math.min(rate,2f));tts.setSpeechRate(speechRate);spoken=text;speechLanguage=language;paused=false;utteranceOffset=spokenOffset;String id=Integer.toString(++speechGeneration);int status=tts.speak(spoken.substring(spokenOffset),TextToSpeech.QUEUE_FLUSH,null,id);audioStatus(status==TextToSpeech.SUCCESS?"Playing · Offline Android voice":"Audio could not play. Please retry.");});}
  @JavascriptInterface public void pause(){runOnUiThread(()->{paused=true;++speechGeneration;tts.stop();audioStatus("Paused. Play resumes from the current word when supported by the speech engine.");});}
  @JavascriptInterface public void stop(){runOnUiThread(()->{paused=false;spokenOffset=0;++speechGeneration;if(tts!=null)tts.stop();});}
  @JavascriptInterface public void exportSummary(String text){if(text.length()>100000)return;runOnUiThread(()->{exportText=text;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("text/plain");i.putExtra(Intent.EXTRA_TITLE,"HealthClear-fictional-doctor-summary.txt");try{startActivityForResult(i,EXPORT);}catch(ActivityNotFoundException e){message("No file-saving app is available.");}});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK){if(request==CAMERA)new File(getCacheDir(),"capture.jpg").delete();if(request==EXPORT)exportText="";return;}if(request==EXPORT){try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new IOException();stream.write(exportText.getBytes(StandardCharsets.UTF_8));message("Summary saved to your chosen location.");}catch(Exception e){message("The summary could not be saved. Please retry.");}finally{exportText="";}return;}if(request!=PICK&&request!=CAMERA)return;Uri uri=request==CAMERA?cameraUri:(data==null?null:data.getData());if(uri==null)return;final int generation=++fileGeneration;message("Opening your report…");worker.execute(()->readReport(uri,generation,request==CAMERA));}
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
