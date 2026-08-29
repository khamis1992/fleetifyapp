using System;
using System.Diagnostics;
using System.IO;
using System.Net;

namespace Fleetify.Taqadi
{
    static class Program
    {
        static int Main(string[] args)
        {
            string uriArg = args.Length > 0 ? args[0] : "";
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string repoRoot = Path.GetFullPath(Path.Combine(appDir, @"..\..\.."));
            string logDir = Path.Combine(repoRoot, @".taqadi-agent\logs");
            string supervisorLog = Path.Combine(logDir, "autostart-supervisor.log");
            string runnerScript = Path.Combine(appDir, "agent-runner.ps1");
            if (!File.Exists(runnerScript))
            {
                runnerScript = Path.Combine(appDir, "run-agent.ps1");
            }
            string taskName = "Fleetify Taqadi Agent";
            string healthUrl = "http://127.0.0.1:4317/health";

            try
            {
                if (!Directory.Exists(logDir))
                {
                    Directory.CreateDirectory(logDir);
                }
            }
            catch { }

            Action<string> log = (msg) =>
            {
                try
                {
                    string line = string.Format("{0:yyyy-MM-dd HH:mm:ss} [launcher-exe] {1}", DateTime.Now, msg);
                    File.AppendAllText(supervisorLog, line + Environment.NewLine);
                }
                catch { }
            };

            // 1. Check if agent is already healthy
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(healthUrl);
                request.Timeout = 2000;
                request.Method = "GET";
                using (var response = (HttpWebResponse)request.GetResponse())
                {
                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        using (var reader = new StreamReader(response.GetResponseStream()))
                        {
                            string body = reader.ReadToEnd();
                            if (body.Contains("\"status\":\"ok\"") || body.Contains("\"status\": \"ok\""))
                            {
                                log("Start requested but the agent is already healthy.");
                                return 0;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Agent offline, proceed
            }

            // 2. Try starting the Scheduled Task via schtasks.exe
            try
            {
                log(string.Format("Start requested ({0}); starting scheduled task via schtasks.", string.IsNullOrEmpty(uriArg) ? "manual" : uriArg));
                var psi = new ProcessStartInfo
                {
                    FileName = "schtasks.exe",
                    Arguments = string.Format("/run /tn \"{0}\"", taskName),
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using (var p = Process.Start(psi))
                {
                    p.WaitForExit(5000);
                    if (p.ExitCode == 0)
                    {
                        log("Scheduled task started successfully.");
                        return 0;
                    }
                    else
                    {
                        string err = p.StandardError.ReadToEnd();
                        log(string.Format("schtasks failed with code {0}: {1}", p.ExitCode, err));
                    }
                }
            }
            catch (Exception ex)
            {
                log(string.Format("Error running schtasks: {0}", ex.Message));
            }

            // 3. Fallback: launch powershell runner directly if task fails
            if (File.Exists(runnerScript))
            {
                log("Falling back to direct runner script execution.");
                try
                {
                    var psi = new ProcessStartInfo
                    {
                        FileName = "powershell.exe",
                        Arguments = string.Format("-NoProfile -NonInteractive -ExecutionPolicy Bypass -File \"{0}\"", runnerScript),
                        WorkingDirectory = repoRoot,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    Process.Start(psi);
                    return 0;
                }
                catch (Exception ex)
                {
                    log(string.Format("Failed to start runner script directly: {0}", ex.Message));
                }
            }

            return 1;
        }
    }
}
