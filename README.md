
# MultiSSH

Multi screen termcaps UI to execute a command into a list of servers.
This module will ssh into each host passed in arguments and execute the command.

![asciicast](asciicast.gif)

**NB: Make sure you have your SSH pub key into each host via `$ ssh-copy-id user@ip`**


```javascript
var multissh = require('multissh');

// Execute command `ls -al` in each host
multissh.start('ls -al', [{
 ip   : ip,
 user : user
}, {
 ip : ip,
 user : user
}], function(cb) {
  // Optionnal callback
});
```

# License

MIT
