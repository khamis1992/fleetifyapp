using System;
using Microsoft.Win32;

namespace Fleetify.Taqadi
{
    class RegisterProtocol
    {
        static int Main(string[] args)
        {
            try
            {
                using (RegistryKey classes = Registry.CurrentUser.OpenSubKey(@"Software\Classes", RegistryKeyPermissionCheck.ReadWriteSubTree))
                {
                    using (RegistryKey scheme = classes.CreateSubKey("fleetify-taqadi", RegistryKeyPermissionCheck.ReadWriteSubTree))
                    {
                        scheme.SetValue("", "URL:Fleetify Taqadi Agent");
                        scheme.SetValue("URL Protocol", "");

                        using (RegistryKey shell = scheme.CreateSubKey("shell", RegistryKeyPermissionCheck.ReadWriteSubTree))
                        using (RegistryKey open = shell.CreateSubKey("open", RegistryKeyPermissionCheck.ReadWriteSubTree))
                        using (RegistryKey cmd = open.CreateSubKey("command", RegistryKeyPermissionCheck.ReadWriteSubTree))
                        {
                            string appDir = AppDomain.CurrentDomain.BaseDirectory;
                            string launcherPath = System.IO.Path.Combine(appDir, "taqadi-launcher.exe");
                            cmd.SetValue("", "\"" + launcherPath + "\" \"%1\"");
                        }
                    }
                }
                Console.WriteLine("PROTOCOL_REGISTERED_SUCCESSFULLY");
                return 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: " + ex.ToString());
                return 1;
            }
        }
    }
}
