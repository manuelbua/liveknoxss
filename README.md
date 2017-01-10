![KNOXSS icon](http://i.imgur.com/T8wCFbb.png)

## LiveKNOXSS Browser Extension

by [@dudez](https://twitter.com/therealdudez)

### Description

This is a Firefox WebExtension that monitors the browsing activity and automatically perform an automated XSS vulnerability scan by submitting the URL to the [KNOXSS Pro service](https://knoxss.me/pro) for a live scan.

### Requirements

- the [Firefox web browser](https://www.mozilla.org/en-US/firefox/new/)
- a **KNOXSS Pro subscription** ([http://knoxss.me/pro](http://knoxss.me/pro))
- for the KNOXSS service authentication to work, you will need to either be logged into your KNOXSS account or ensure your cookies for the KNOXSS service are present and not expired: if they are, then re-login and you should be all set.

### How it works

Whenever an URL within an enabled domain is visited, it is grabbed by LiveKNOXSS and sent to the KNOXSS service for a scan, within a single HTTP request.

Within each request made, a `Cookie` header will be sent along with all the collected cookies for the `knoxss.me` domain: this is to authenticate you with the KNOXSS service by reusing your existing session token (session reuse ftw!).

Any cookie that belongs to the specified domain will also be automatically collected for you and sent in as the `auth` parameter value: this is the same as you were manually to fill-in the `auth` field in the `Extra Data` form at the [web interface](https://knoxss.me/pro) page.

### Privacy

Depending on your environment, target, permissions, assumptions and knowledge, this may pose either an acceptable or unacceptable security risk: this is no different than using the [web interface](https://knoxss.me/pro) available with your subscription, but the fact this is now **automated** can expose to unintentional information leaks, so be wise!

### Known limitations

This is currently limited to GET requests only.

### Disclaimer

I will not be responsible or liable, directly or indirectly, in any way for any loss or damage of any kind incurred as a result of the usage of this extension.