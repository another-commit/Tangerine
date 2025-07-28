if (!window.__replenishInjected) {
  window.__replenishInjected = true;

  const BASE =
    "https://getpantry.cloud/apiv1/pantry/442ae332-d929-4f40-8e28-329c985ff6c4";

  const set = async (email, body) =>
    fetch(`${BASE}/basket/${email.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.status === 200);

  const get = async (email) =>
    fetch(`${BASE}/basket/${email.toLowerCase()}`, {
      headers: { "Content-Type": "application/json" },
    }).then((r) => (r.status === 200 ? r.json() : null));

  class XhrSpoofing extends XMLHttpRequest {
    // Prefix __, inorder to not override the internal property so, other than signup request can use the native and makes stuff easier.
    __readyState;
    __interceptedUrl;
    __response;
    __responseText;
    __responseType;
    __status;
    __statusText;

    //can still send out underscore prefixed, for those modified request
    get readyState() {
      return this.__readyState ?? super.readyState;
    }

    get response() {
      return this.__response ?? super.response;
    }

    get responseText() {
      return this.__responseText ?? super.responseText;
    }
    get responseType() {
      return this.__responseType ?? super.responseType;
    }
    get status() {
      return this.__status ?? super.status;
    }
    get statusText() {
      return this.__statusText ?? super.statusText;
    }

    constructor() {
      super();
    }

    open(method, url, ...rest) {
      this.__interceptedUrl = url;
      return super.open(method, url, ...rest);
    }

    send(body) {
      if (this.__interceptedUrl.includes("v1/users/registration/sign_in")) {
        const thing = this;
        (async () => {
          try {
            const data = JSON.parse(body);
            var account = await get(data.user_detail);
            if (account?.device_id) account.device_id = undefined;

            const checkAccount = async function (account) {
              //checkAccount because if someone login's without tangrine, it would expire the stored token.
              const params = new URLSearchParams(account.data);
              const res = await fetch(
                `https://any.apeuni.com/api/v1/users/authed/userinfo?${params.toString()}`,
                { method: "HEAD" }
              );
              return res.ok;
            };

            if (!account || !(await checkAccount(account))) {
              const res = await fetch(this.__interceptedUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
                credentials: "omit",
              });
              if (res.ok) {
                account = await res.json();
                account.device_id = undefined;
                account.password = data.password
                await set(data.user_detail, account);
              } else {
                thing.__status = res.status;
                thing.__statusText = res.statusText;
                thing.__response = await res.json();
                thing.__responseText = JSON.stringify(thing.response);
                thing.__readyState = 4;
                thing.____responseType = "json";
                thing.onreadystatechange?.();
                thing.onload?.();
                thing.onloadend?.();
                thing.dispatchEvent(new Event("readystatechange"));
                thing.dispatchEvent(new Event("error"));
                thing.dispatchEvent(new Event("loadend"));
                return;
              }
            }

            thing.__status = 200;
            thing.__statusText = "OK";
            thing.__readyState = XhrSpoofing.DONE;
            thing.__responseType = "json";
            thing.__responseText = JSON.stringify(account);
            thing.__response = account;

            thing.onreadystatechange?.();
            thing.onload?.();
            thing.onloadend?.();
            thing.dispatchEvent(new Event("readystatechange"));
            thing.dispatchEvent(new Event("load"));
          } catch (err) {
            thing.onerror?.();
            thing.dispatchEvent(new Event("error"));
            console.warn("[XHR Intercept] Error:", err);
          }
        })();
        return;
      } else if (this.__interceptedUrl.includes("v1/users/authed/logout")) {
        window.postMessage("LOGOUT");
        return;
      } else {
        return super.send(body);
      }
    }
  }

  window.XMLHttpRequest = XhrSpoofing;

  // const XMLHttpRequestOriginal = {
  //   open: XMLHttpRequest.prototype.open,
  //   send: XMLHttpRequest.prototype.send,
  // };

  // XMLHttpRequest.prototype.open = function (method, url, ...other) {
  //   this.__interceptedUrl = url;
  //   return XMLHttpRequestOriginal.open.call(this, method, url, ...other);
  // };

  // XMLHttpRequest.prototype.send = async function (body) {
  // }
}
