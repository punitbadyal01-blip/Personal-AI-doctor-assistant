package com.healthclear.app;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
public final class CameraProvider extends ContentProvider {
 public boolean onCreate(){return true;}
 private File file(Uri uri)throws FileNotFoundException {if(!"/capture.jpg".equals(uri.getPath()))throw new FileNotFoundException();return new File(getContext().getCacheDir(),"capture.jpg");}
 public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.parseMode(mode));}
 public String getType(Uri uri){return "image/jpeg";}
 public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){MatrixCursor c=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});try{File f=file(uri);c.addRow(new Object[]{"camera-report.jpg",f.length()});}catch(Exception ignored){}return c;}
 public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
 public int update(Uri uri,ContentValues values,String where,String[] args){throw new UnsupportedOperationException();}
 public int delete(Uri uri,String where,String[] args){throw new UnsupportedOperationException();}
}
