## LiveKNOXSS Extension

by [@therealdudez](https://twitter.com/therealdudez)

### Description

Extension to communicate with the KNOXSS Pro service at https://knoxss.me

A WebExtension that monitors the URL for changes and submit it automatically to the KNOXSS Pro service for an XSS live scan as you browse.

### DISCLAIMER

I will not be responsible or liable, directly or indirectly, in any way for any loss or damage of any kind incurred as a result of the usage of this extension.

### PRIVACY

This extension will send a target URL along with any collected cookie for that domain to the KNOXSS service for a live scan.

### REQUIREMENTS

You need to be logged into your KNOXSS account first, since each request to the KNOXSS server will add a `Cookie` header with all the collected cookies for the `knoxss.me` domain.
