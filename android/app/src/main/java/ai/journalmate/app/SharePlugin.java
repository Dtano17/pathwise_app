package ai.journalmate.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "SharePlugin")
public class SharePlugin extends Plugin {

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        String shareData = MainActivity.getPendingShareData();
        
        JSObject result = new JSObject();
        if (shareData != null) {
            result.put("data", shareData);
            result.put("hasData", true);
        } else {
            result.put("data", null);
            result.put("hasData", false);
        }
        
        call.resolve(result);
    }
}
