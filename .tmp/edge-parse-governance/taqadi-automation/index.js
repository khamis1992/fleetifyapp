// supabase/functions/taqadi-automation/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
var BROWSERBASE_API_KEY = Deno.env.get("BROWSERBASE_API_KEY") || "";
var BROWSERBASE_PROJECT_ID = Deno.env.get("BROWSERBASE_PROJECT_ID") || "";
async function executeCDPCommands(connectUrl, commands) {
  return new Promise((resolve, reject) => {
    console.log(`[CDP] Connecting to browser...`);
    const ws = new WebSocket(connectUrl);
    let messageId = 0;
    let completedCommands = 0;
    const timeout = setTimeout(() => {
      console.log("[CDP] Timeout - closing connection");
      ws.close();
      resolve();
    }, 15e3);
    ws.onopen = () => {
      console.log(`[CDP] Connected! Sending ${commands.length} commands...`);
      for (const cmd of commands) {
        messageId++;
        const message = { id: messageId, method: cmd.method, params: cmd.params || {} };
        console.log(`[CDP] Sending: ${cmd.method}`);
        ws.send(JSON.stringify(message));
      }
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id) {
          completedCommands++;
          console.log(`[CDP] Response ${completedCommands}/${commands.length}: ${data.error ? "Error" : "OK"}`);
          if (completedCommands >= commands.length) {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        }
      } catch (e) {
        console.log("[CDP] Parse error:", e);
      }
    };
    ws.onerror = () => {
      console.log("[CDP] WebSocket error");
      clearTimeout(timeout);
      resolve();
    };
    ws.onclose = () => {
      console.log("[CDP] Connection closed");
      clearTimeout(timeout);
      resolve();
    };
  });
}
async function navigateToTaqadi(sessionId, connectUrl) {
  console.log("[CDP] Starting navigation to Taqadi...");
  await new Promise((r) => setTimeout(r, 2e3));
  try {
    console.log("[CDP] Attempting navigation via connectUrl...");
    const targetsResult = await new Promise((resolve, reject) => {
      const ws = new WebSocket(connectUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Timeout getting targets"));
      }, 1e4);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: "Target.getTargets" }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === 1) {
          clearTimeout(timeout);
          ws.close();
          resolve(data.result);
        }
      };
      ws.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });
    console.log("[CDP] Got targets:", targetsResult?.targetInfos?.length || 0);
    const pageTarget = targetsResult?.targetInfos?.find((t) => t.type === "page");
    if (pageTarget) {
      console.log("[CDP] Found page target:", pageTarget.targetId);
      const attachResult = await new Promise((resolve, reject) => {
        const ws = new WebSocket(connectUrl);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("Timeout attaching to target"));
        }, 1e4);
        let sessionId2 = null;
        ws.onopen = () => {
          ws.send(JSON.stringify({
            id: 1,
            method: "Target.attachToTarget",
            params: { targetId: pageTarget.targetId, flatten: true }
          }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === 1 && data.result?.sessionId) {
            sessionId2 = data.result.sessionId;
            console.log("[CDP] Attached to page, sessionId:", sessionId2);
            ws.send(JSON.stringify({
              id: 2,
              method: "Page.navigate",
              params: { url: "https://taqadi.sjc.gov.qa/itc/" },
              sessionId: sessionId2
            }));
          }
          if (data.id === 2) {
            clearTimeout(timeout);
            console.log("[CDP] Navigation command sent!");
            ws.close();
            resolve(data.result);
          }
        };
        ws.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });
      console.log("[CDP] Navigation result:", attachResult);
    } else {
      console.log("[CDP] No page target found, trying direct navigation...");
      await executeCDPCommands(connectUrl, [
        { method: "Target.createTarget", params: { url: "https://taqadi.sjc.gov.qa/itc/" } }
      ]);
    }
    console.log("[CDP] Navigation completed!");
  } catch (error) {
    console.log("[CDP] Navigation error:", error.message);
    try {
      const debugResponse = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}/debug`, {
        headers: { "x-bb-api-key": BROWSERBASE_API_KEY }
      });
      if (debugResponse.ok) {
        const debugInfo = await debugResponse.json();
        console.log("[CDP] Fallback - using debug info");
        if (debugInfo.pages?.[0]?.webSocketDebuggerUrl) {
          const pageWsUrl = debugInfo.pages[0].webSocketDebuggerUrl;
          console.log("[CDP] Navigating via page WS URL...");
          await executeCDPCommands(pageWsUrl, [
            { method: "Page.navigate", params: { url: "https://taqadi.sjc.gov.qa/itc/" } }
          ]);
        }
      }
    } catch (fallbackError) {
      console.log("[CDP] Fallback also failed:", fallbackError.message);
    }
  }
}
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
async function getAllSessions() {
  console.log("[Taqadi] Fetching all sessions...");
  const statuses = ["running", "pending", "new"];
  const allSessions = [];
  for (const status of statuses) {
    try {
      const response = await fetch(`https://www.browserbase.com/v1/sessions?status=${status}`, {
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY
        }
      });
      if (response.ok) {
        const sessions = await response.json();
        if (Array.isArray(sessions)) {
          allSessions.push(...sessions);
        }
      }
    } catch (e) {
      console.error("[Taqadi] Error fetching sessions with status:", status);
    }
  }
  console.log("[Taqadi] Found", allSessions.length, "sessions total");
  return allSessions;
}
async function forceCleanupAllSessions() {
  console.log("[Taqadi] Force cleaning up ALL sessions...");
  const sessions = await getAllSessions();
  let cleaned = 0;
  for (const session of sessions) {
    if (session.status === "COMPLETED" || session.status === "ERROR" || session.endedAt) {
      console.log("[Taqadi] Skipping completed session:", session.id);
      continue;
    }
    try {
      console.log("[Taqadi] Force releasing session:", session.id, "status:", session.status);
      const releaseResponse = await fetch(`https://www.browserbase.com/v1/sessions/${session.id}`, {
        method: "POST",
        headers: {
          "x-bb-api-key": BROWSERBASE_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          projectId: BROWSERBASE_PROJECT_ID,
          status: "REQUEST_RELEASE"
        })
      });
      if (releaseResponse.ok) {
        cleaned++;
        console.log("[Taqadi] Session released successfully:", session.id);
      } else {
        const errorText = await releaseResponse.text();
        console.log("[Taqadi] Release failed:", releaseResponse.status, errorText);
      }
    } catch (e) {
      console.error("[Taqadi] Error releasing session:", session.id, e);
    }
  }
  if (cleaned > 0) {
    console.log("[Taqadi] Released", cleaned, "sessions. Waiting 3 seconds...");
    await new Promise((r) => setTimeout(r, 3e3));
  }
  return cleaned;
}
async function createBrowserSession(retryCount = 0) {
  console.log("[Taqadi] Creating Browserbase session (attempt", retryCount + 1, ")...");
  console.log("[Taqadi] Project ID:", BROWSERBASE_PROJECT_ID);
  if (retryCount === 0) {
    console.log("[Taqadi] Proactively cleaning old sessions before creating new one...");
    await forceCleanupAllSessions();
  }
  const requestBody = {
    projectId: BROWSERBASE_PROJECT_ID,
    browserSettings: {
      // Browserbase يولد fingerprints عشوائية تلقائياً
      // لا تحدد fingerprint لتحسين anti-detection
      solveCaptchas: true
      // حل CAPTCHA تلقائياً
    },
    proxies: true,
    // ✅ تفعيل Proxies لإخفاء IP وتجنب الكشف
    keepAlive: true,
    // إبقاء الجلسة مفتوحة حتى يتفاعل المستخدم
    timeout: 1800
    // 30 دقيقة
  };
  console.log("[Taqadi] Request body:", JSON.stringify(requestBody));
  const response = await fetch("https://www.browserbase.com/v1/sessions", {
    method: "POST",
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  console.log("[Taqadi] Browserbase response status:", response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Taqadi] Browserbase error:", errorText);
    if (response.status === 429 && retryCount < 2) {
      console.log("[Taqadi] Rate limited! Force cleaning and retrying...");
      await forceCleanupAllSessions();
      console.log("[Taqadi] Waiting 10 seconds before retry...");
      await new Promise((r) => setTimeout(r, 1e4));
      return createBrowserSession(retryCount + 1);
    }
    throw new Error(`Browserbase error (${response.status}): ${errorText}`);
  }
  const session = await response.json();
  console.log("[Taqadi] Session created successfully:", session.id);
  const debugUrl = await getDebuggerUrl(session.id);
  return {
    sessionId: session.id,
    connectUrl: session.connectUrl,
    liveUrl: debugUrl
  };
}
async function getDebuggerUrl(sessionId) {
  console.log("[Taqadi] Getting debugger URL for session:", sessionId);
  await new Promise((r) => setTimeout(r, 2e3));
  const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}/debug`, {
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY
    }
  });
  if (!response.ok) {
    console.error("[Taqadi] Failed to get debug URL, using fallback");
    return `https://www.browserbase.com/sessions/${sessionId}/live`;
  }
  const debugInfo = await response.json();
  console.log("[Taqadi] Debug info received:", debugInfo.debuggerFullscreenUrl?.substring(0, 50));
  return debugInfo.debuggerFullscreenUrl || `https://www.browserbase.com/sessions/${sessionId}/live`;
}
async function getSessionStatus(sessionId) {
  const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY
    }
  });
  if (!response.ok) {
    throw new Error("Failed to get session status");
  }
  return response.json();
}
async function cancelSession(sessionId) {
  await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "x-bb-api-key": BROWSERBASE_API_KEY
    }
  });
}
function generateAutomationScript(data) {
  return `
// ====== \u0633\u0643\u0631\u0628\u062A \u0623\u062A\u0645\u062A\u0629 \u062A\u0642\u0627\u0636\u064A - \u0634\u0631\u0643\u0629 \u0627\u0644\u0639\u0631\u0627\u0641 ======

const LAWSUIT_DATA = ${JSON.stringify(data, null, 2)};

// \u062F\u0627\u0644\u0629 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// \u062F\u0627\u0644\u0629 \u062A\u0639\u0628\u0626\u0629 \u062D\u0642\u0644 \u0646\u0635\u064A
async function fillField(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// \u062F\u0627\u0644\u0629 \u0627\u0644\u0646\u0642\u0631
async function clickElement(selector) {
  const element = document.querySelector(selector);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

// \u062F\u0627\u0644\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0645\u0646\u0633\u062F\u0644\u0629
async function selectOption(selector, value) {
  const dropdown = document.querySelector(selector);
  if (dropdown) {
    dropdown.click();
    await sleep(500);
    const option = [...document.querySelectorAll('li.k-item')].find(el => 
      el.textContent.includes(value)
    );
    if (option) {
      option.click();
      return true;
    }
  }
  return false;
}

// \u0627\u0644\u062E\u0637\u0648\u0629 1: \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644
async function waitForLogin() {
  console.log('\u23F3 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644...');
  while (!window.location.href.includes('/home')) {
    await sleep(1000);
  }
  console.log('\u2705 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644!');
}

// \u0627\u0644\u062E\u0637\u0648\u0629 2: \u0627\u0644\u0630\u0647\u0627\u0628 \u0644\u0625\u0646\u0634\u0627\u0621 \u062F\u0639\u0648\u0649
async function goToCreateCase() {
  console.log('\u{1F504} \u062C\u0627\u0631\u064A \u0627\u0644\u0630\u0647\u0627\u0628 \u0644\u0635\u0641\u062D\u0629 \u0625\u0646\u0634\u0627\u0621 \u062F\u0639\u0648\u0649...');
  window.location.href = 'https://taqadi.sjc.gov.qa/itc/f/caseinfo/create';
  await sleep(3000);
}

// \u0627\u0644\u062E\u0637\u0648\u0629 3: \u0627\u062E\u062A\u064A\u0627\u0631 \u0646\u0648\u0639 \u0627\u0644\u062F\u0639\u0648\u0649
async function selectCaseType() {
  console.log('\u{1F504} \u062C\u0627\u0631\u064A \u0627\u062E\u062A\u064A\u0627\u0631 \u0646\u0648\u0639 \u0627\u0644\u062F\u0639\u0648\u0649...');
  await sleep(2000);
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 "\u0639\u0642\u0648\u062F \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629"
  const serviceContracts = [...document.querySelectorAll('li.k-item')].find(el => 
    el.textContent.includes('\u0639\u0642\u0648\u062F \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629')
  );
  if (serviceContracts) serviceContracts.click();
  await sleep(1000);
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 "\u0639\u0642\u0648\u062F \u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A"
  const carRental = [...document.querySelectorAll('li.k-item')].find(el => 
    el.textContent.includes('\u0639\u0642\u0648\u062F \u0625\u064A\u062C\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A')
  );
  if (carRental) carRental.click();
  await sleep(1000);
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0627\u0644\u064A
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('\u0627\u0644\u062A\u0627\u0644\u064A')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('\u2705 \u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0646\u0648\u0639 \u0627\u0644\u062F\u0639\u0648\u0649');
}

// \u0627\u0644\u062E\u0637\u0648\u0629 4: \u062A\u0639\u0628\u0626\u0629 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0639\u0648\u0649
async function fillCaseDetails() {
  console.log('\u{1F504} \u062C\u0627\u0631\u064A \u062A\u0639\u0628\u0626\u0629 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0639\u0648\u0649...');
  await sleep(2000);
  
  // \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0639\u0648\u0649
  const titleInput = document.querySelector('input[aria-label*="\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0639\u0648\u0649"]') ||
                     document.querySelector('input.k-textbox');
  if (titleInput) {
    titleInput.value = LAWSUIT_DATA.caseTitle;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // \u0627\u0644\u0648\u0642\u0627\u0626\u0639
  const factsTextarea = document.querySelector('textarea[aria-label*="\u0627\u0644\u0648\u0642\u0627\u0626\u0639"]') ||
                        document.querySelectorAll('textarea')[0];
  if (factsTextarea) {
    factsTextarea.value = LAWSUIT_DATA.facts;
    factsTextarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // \u0627\u0644\u0637\u0644\u0628\u0627\u062A (\u0642\u062F \u062A\u0643\u0648\u0646 \u0641\u064A TinyMCE)
  const requestsIframe = document.querySelector('iframe[id*="caseDetails"]');
  if (requestsIframe) {
    const iframeDoc = requestsIframe.contentDocument || requestsIframe.contentWindow.document;
    iframeDoc.body.replaceChildren();
    LAWSUIT_DATA.claims.split(/\\n/g).forEach((line, index) => {
      if (index > 0) iframeDoc.body.appendChild(iframeDoc.createElement('br'));
      iframeDoc.body.appendChild(iframeDoc.createTextNode(line));
    });
  }
  await sleep(500);
  
  // \u0646\u0648\u0639 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629
  const claimTypeDropdown = document.querySelector('.k-dropdownlist[aria-label*="\u0646\u0648\u0639 \u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0629"]');
  if (claimTypeDropdown) {
    claimTypeDropdown.click();
    await sleep(500);
    const financialClaim = [...document.querySelectorAll('li.k-item')].find(el => 
      el.textContent.includes('\u0645\u0637\u0627\u0644\u0628\u0629 \u0645\u0627\u0644\u064A\u0629')
    );
    if (financialClaim) financialClaim.click();
  }
  await sleep(500);
  
  // \u0627\u0644\u0645\u0628\u0644\u063A
  const amountInput = document.querySelector('input[type="number"]') ||
                      document.querySelector('input.k-formatted-value');
  if (amountInput) {
    amountInput.value = LAWSUIT_DATA.amount;
    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await sleep(500);
  
  // \u0627\u0644\u0645\u0628\u0644\u063A \u0643\u062A\u0627\u0628\u0629
  const amountWordsInput = document.querySelector('input[aria-label*="\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0643\u062A\u0627\u0628\u0629"]');
  if (amountWordsInput) {
    amountWordsInput.value = LAWSUIT_DATA.amountInWords;
    amountWordsInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await sleep(500);
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0627\u0644\u064A
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('\u0627\u0644\u062A\u0627\u0644\u064A')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('\u2705 \u062A\u0645 \u062A\u0639\u0628\u0626\u0629 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0639\u0648\u0649');
}

// \u0627\u0644\u062E\u0637\u0648\u0629 5: \u0625\u0636\u0627\u0641\u0629 \u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u062F\u0639\u0648\u0649
async function addParties() {
  console.log('\u{1F504} \u062C\u0627\u0631\u064A \u0625\u0636\u0627\u0641\u0629 \u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u062F\u0639\u0648\u0649...');
  await sleep(2000);
  
  // \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0632\u0631 \u0625\u0636\u0627\u0641\u0629 \u0645\u062F\u0639\u0649 \u0639\u0644\u064A\u0647
  const addDefendantBtn = [...document.querySelectorAll('button, a')].find(el => 
    el.textContent.includes('\u0625\u0636\u0627\u0641\u0629 \u0645\u062F\u0639\u0649 \u0639\u0644\u064A\u0647') || el.textContent.includes('\u0625\u0636\u0627\u0641\u0629 \u0637\u0631\u0641')
  );
  
  if (addDefendantBtn) {
    addDefendantBtn.click();
    await sleep(2000);
    
    // \u0627\u062E\u062A\u064A\u0627\u0631 \u0634\u062E\u0635 \u0637\u0628\u064A\u0639\u064A
    const personRadio = [...document.querySelectorAll('input[type="radio"]')].find(radio => {
      const label = radio.closest('label') || radio.parentElement;
      return label && (label.textContent.includes('\u0637\u0628\u064A\u0639\u064A') || label.textContent.includes('\u0641\u0631\u062F'));
    });
    if (personRadio) personRadio.click();
    await sleep(500);
    
    // \u062A\u0639\u0628\u0626\u0629 \u0627\u0644\u0627\u0633\u0645
    const nameInputs = document.querySelectorAll('input[type="text"]');
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && label.textContent.includes('\u0627\u0633\u0645')) {
        input.value = LAWSUIT_DATA.defendantName;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // \u062A\u0639\u0628\u0626\u0629 \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && (label.textContent.includes('\u0647\u0648\u064A\u0629') || label.textContent.includes('QID'))) {
        input.value = LAWSUIT_DATA.defendantIdNumber || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // \u062A\u0639\u0628\u0626\u0629 \u0627\u0644\u0647\u0627\u062A\u0641
    for (const input of nameInputs) {
      const label = input.closest('div')?.querySelector('label');
      if (label && label.textContent.includes('\u0647\u0627\u062A\u0641')) {
        input.value = LAWSUIT_DATA.defendantPhone || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
    await sleep(500);
    
    // \u062D\u0641\u0638
    const saveBtn = [...document.querySelectorAll('button, a')].find(el => 
      el.textContent.includes('\u062D\u0641\u0638') || el.textContent.includes('\u0625\u0636\u0627\u0641\u0629')
    );
    if (saveBtn) saveBtn.click();
    await sleep(2000);
  }
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0627\u0644\u064A
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('\u0627\u0644\u062A\u0627\u0644\u064A')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('\u2705 \u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u062F\u0639\u0648\u0649');
}

// \u062F\u0627\u0644\u0629 \u062A\u062D\u0645\u064A\u0644 \u0645\u0644\u0641 \u0645\u0646 URL \u0648\u062A\u062D\u0648\u064A\u0644\u0647 \u0644\u0640 File
async function downloadFileAsBlob(url, filename) {
  try {
    console.log('   \u{1F4E5} \u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644: ' + filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error('\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0645\u064A\u0644');
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'application/pdf' });
  } catch (error) {
    console.error('   \u274C \u0641\u0634\u0644 \u062A\u062D\u0645\u064A\u0644: ' + filename, error);
    return null;
  }
}

// \u062F\u0627\u0644\u0629 \u0631\u0641\u0639 \u0645\u0644\u0641 \u0644\u062D\u0642\u0644 input[type="file"]
async function uploadFileToInput(inputElement, file) {
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputElement.files = dataTransfer.files;
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(1000);
    return true;
  } catch (error) {
    console.error('   \u274C \u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641:', error);
    return false;
  }
}

// \u0627\u0644\u062E\u0637\u0648\u0629 6: \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A (\u0631\u0641\u0639 \u062A\u0644\u0642\u0627\u0626\u064A)
async function handleDocuments() {
  console.log('\u{1F4C4} \u062C\u0627\u0631\u064A \u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B...');
  await sleep(2000);
  
  const docs = LAWSUIT_DATA.documents || {};
  const documentsToUpload = [
    { url: docs.commercialRegisterUrl, name: '\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A.pdf', label: '\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A' },
    { url: docs.establishmentRecordUrl, name: '\u0642\u064A\u062F \u0627\u0644\u0645\u0646\u0634\u0623\u0629.pdf', label: '\u0642\u064A\u062F \u0627\u0644\u0645\u0646\u0634\u0623\u0629' },
    { url: docs.ibanCertificateUrl, name: '\u0634\u0647\u0627\u062F\u0629 IBAN.pdf', label: '\u0634\u0647\u0627\u062F\u0629 IBAN' },
    { url: docs.representativeIdUrl, name: '\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629.pdf', label: '\u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0634\u062E\u0635\u064A\u0629' },
    { url: docs.contractUrl, name: '\u0627\u0644\u0639\u0642\u062F.pdf', label: '\u0627\u0644\u0639\u0642\u062F' },
    { url: docs.explanatoryMemoUrl, name: '\u0627\u0644\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u0634\u0627\u0631\u062D\u0629.pdf', label: '\u0627\u0644\u0645\u0630\u0643\u0631\u0629 \u0627\u0644\u0634\u0627\u0631\u062D\u0629' },
  ].filter(d => d.url);
  
  let uploadedCount = 0;
  
  for (const doc of documentsToUpload) {
    try {
      console.log('   \u{1F4E4} \u062C\u0627\u0631\u064A \u0631\u0641\u0639: ' + doc.label);
      
      // \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0632\u0631 \u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062A\u0646\u062F
      const addDocBtn = [...document.querySelectorAll('button, a')].find(el => 
        el.textContent.includes('\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062A\u0646\u062F') || 
        el.textContent.includes('\u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0641') ||
        el.textContent.includes('\u0631\u0641\u0639')
      );
      
      if (addDocBtn) {
        addDocBtn.click();
        await sleep(1500);
        
        // \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0644\u0641
        const file = await downloadFileAsBlob(doc.url, doc.name);
        if (!file) continue;
        
        // \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u062D\u0642\u0644 \u0627\u0644\u0645\u0644\u0641
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          const success = await uploadFileToInput(fileInput, file);
          if (success) {
            // \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0642\u0627\u0626\u0645\u0629 \u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0648\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u0627\u0633\u0628
            const docTypeDropdown = document.querySelector('.k-dropdownlist');
            if (docTypeDropdown) {
              docTypeDropdown.click();
              await sleep(500);
              const option = [...document.querySelectorAll('li.k-item')].find(el => 
                el.textContent.includes(doc.label)
              );
              if (option) option.click();
            }
            
            await sleep(500);
            
            // \u062D\u0641\u0638 \u0627\u0644\u0645\u0633\u062A\u0646\u062F
            const saveBtn = [...document.querySelectorAll('button')].find(el => 
              el.textContent.includes('\u062D\u0641\u0638') || el.textContent.includes('\u0631\u0641\u0639') || el.textContent.includes('\u0625\u0636\u0627\u0641\u0629')
            );
            if (saveBtn) {
              saveBtn.click();
              await sleep(2000);
            }
            
            uploadedCount++;
            console.log('   \u2705 \u062A\u0645 \u0631\u0641\u0639: ' + doc.label);
          }
        }
      }
    } catch (error) {
      console.error('   \u274C \u062E\u0637\u0623 \u0641\u064A \u0631\u0641\u0639 ' + doc.label + ':', error);
    }
  }
  
  console.log('\u{1F4CA} \u062A\u0645 \u0631\u0641\u0639 ' + uploadedCount + ' \u0645\u0646 ' + documentsToUpload.length + ' \u0645\u0633\u062A\u0646\u062F\u0627\u062A');
  
  // \u0625\u0630\u0627 \u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 \u0623\u064A \u0645\u0644\u0641 \u0623\u0648 \u0628\u0639\u0636 \u0627\u0644\u0645\u0644\u0641\u0627\u062A \u0645\u0641\u0642\u0648\u062F\u0629
  if (uploadedCount < documentsToUpload.length || documentsToUpload.length === 0) {
    const missingDocs = documentsToUpload.length === 0 
      ? '\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A' 
      : (documentsToUpload.length - uploadedCount) + ' \u0645\u0633\u062A\u0646\u062F\u0627\u062A';
    
    alert('\u26A0\uFE0F \u062A\u0646\u0628\u064A\u0647:\\n\\n\u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 ' + missingDocs + ' \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.\\n\\n\u064A\u0631\u062C\u0649:\\n1. \u0631\u0641\u0639 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629 \u064A\u062F\u0648\u064A\u0627\u064B\\n2. \u0627\u0636\u063A\u0637 OK \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629');
  }
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0627\u0644\u064A
  await sleep(1000);
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('\u0627\u0644\u062A\u0627\u0644\u064A')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
}

// \u0627\u0644\u062E\u0637\u0648\u0629 7: \u0627\u0644\u0631\u0633\u0648\u0645
async function handleFees() {
  console.log('\u{1F4B0} \u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0633\u0648\u0645...');
  await sleep(2000);
  
  // \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u062A\u0627\u0644\u064A
  const nextBtn = [...document.querySelectorAll('a')].find(el => 
    el.textContent.includes('\u0627\u0644\u062A\u0627\u0644\u064A')
  );
  if (nextBtn) nextBtn.click();
  await sleep(2000);
  
  console.log('\u2705 \u062A\u0645 \u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0644\u062E\u0635');
}

// \u0627\u0644\u062E\u0637\u0648\u0629 8: \u0627\u0644\u0645\u0644\u062E\u0635
async function showSummary() {
  console.log('\u{1F4CB} \u0635\u0641\u062D\u0629 \u0645\u0644\u062E\u0635 \u0627\u0644\u062F\u0639\u0648\u0649');
  console.log('\u2705 \u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0639\u0628\u0626\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629!');
  console.log('\u26A0\uFE0F \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u062B\u0645 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0627\u0639\u062A\u0645\u0627\u062F" \u0644\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u062F\u0639\u0648\u0649');
  
  alert('\u062A\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u062A\u0639\u0628\u0626\u0629 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A\u0629!\\n\\n\u064A\u0631\u062C\u0649:\\n1. \u0645\u0631\u0627\u062C\u0639\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A\\n2. \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 "\u0627\u0639\u062A\u0645\u0627\u062F" \u0644\u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u062F\u0639\u0648\u0649');
}

// \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0623\u062A\u0645\u062A\u0629
async function runAutomation() {
  try {
    await waitForLogin();
    await goToCreateCase();
    await selectCaseType();
    await fillCaseDetails();
    await addParties();
    await handleDocuments();
    await handleFees();
    await showSummary();
  } catch (error) {
    console.error('\u274C \u062E\u0637\u0623:', error);
    alert('\u062D\u062F\u062B \u062E\u0637\u0623: ' + error.message);
  }
}

// \u0628\u062F\u0621 \u0627\u0644\u062A\u0634\u063A\u064A\u0644
runAutomation();
`;
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: "LEGACY_TAQADI_BYPASS_RETIRED",
      message: "\u0627\u0633\u062A\u062E\u062F\u0645 \u0637\u0627\u0628\u0648\u0631 taqadi_filing_jobs \u0627\u0644\u0645\u062D\u0643\u0648\u0645 \u0648\u0648\u0643\u064A\u0644 \u062A\u0642\u0627\u0636\u064A \u0627\u0644\u0645\u062D\u0644\u064A."
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  try {
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      throw new Error("Browserbase credentials are not configured");
    }
    const request = await req.json();
    console.log("[Taqadi] Received request:", JSON.stringify({ action: request.action, hasLawsuitData: !!request.lawsuitData }));
    switch (request.action) {
      case "start": {
        if (!request.lawsuitData) {
          throw new Error("Missing lawsuit data");
        }
        const session = await createBrowserSession();
        const script = generateAutomationScript(request.lawsuitData);
        let navigationSuccess = false;
        try {
          await navigateToTaqadi(session.sessionId, session.connectUrl);
          navigationSuccess = true;
          console.log("[Taqadi] Navigation completed successfully!");
        } catch (e) {
          console.log("[Taqadi] CDP navigation failed:", e.message);
        }
        return new Response(
          JSON.stringify({
            success: true,
            sessionId: session.sessionId,
            liveUrl: session.liveUrl,
            connectUrl: session.connectUrl,
            script,
            message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062C\u0644\u0633\u0629 \u0627\u0644\u0645\u062A\u0635\u0641\u062D. \u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0646\u0642\u0644 \u0644\u0645\u0648\u0642\u0639 \u062A\u0642\u0627\u0636\u064A..."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      case "status": {
        if (!request.sessionId) {
          throw new Error("Missing session ID");
        }
        const status = await getSessionStatus(request.sessionId);
        return new Response(
          JSON.stringify({
            success: true,
            status
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      case "cancel": {
        if (!request.sessionId) {
          throw new Error("Missing session ID");
        }
        await cancelSession(request.sessionId);
        return new Response(
          JSON.stringify({
            success: true,
            message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062C\u0644\u0633\u0629"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("[Taqadi] Error:", error.message);
    console.error("[Taqadi] Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
