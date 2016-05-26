

var blessed      = require('blessed');
var async        = require('async');
var sshexec      = require('ssh-exec');
var moment       = require('moment');
var chalk        = require('chalk');
var EventEmitter = require('events');
var pkg          = require('./package.json');
var exec = require('child_process').exec;

var WinMode = {
  initUX : function(opts) {
    var that        = this;
    var cmd         = opts.cmd;
    var server_list = opts.server_list;

    var screen = this.screen = blessed.screen({
      smartCSR : true,
      autoPadding: true,
      title : 'MultiSSH ' + pkg.version + ' $ ' + cmd
    });

    var textbox = this.textbox = blessed.list({
      parent: screen,
      height : '100%',
      width: '80%+1',
      scrollable : true,
      border: 'line',
      label : opts.title || chalk.bold(' MultiSSH ' + pkg.version) + ': SSH command result ',
      top: 0,
      left: 0,
      padding : 2,
      style : {
        border: {
          fg: 'cyan',
          bold : true
        }
      }
    });

    var text = blessed.table({
      parent: screen,
      keys: true,
      label : chalk.bold(' Helper '),
      width: '20%',
      border: 'line',
      bottom: 0,
      right: 0,
      style: {
        fg: 'white',
        bg: 'default',
        border: {
          fg: 'cyan',
          bold : true
        },
        selected: {
        }
      }
    });

    text.setData([
      ['Key up', 'Select prev server'],
      ['Key down', 'Select next server'],
      [ 'Ctrl-c', 'Exit MultiSSH']
    ]);
    // text.setContent('Curr. Command: $ ' + chalk.bold(cmd) + '\n\n' +
    //                 'Key up: Select prev server\n' +
    //                 'Key down: Select next server\n' +
    //                 'Ctrl-c: Exit MultiSSH\n');

    var list = blessed.list({
      parent: screen,
      keys: true,
      label : chalk.bold(' Server list '),
      height : '85%',
      scrollable : false,
      width: '20%',
      border: 'line',
      top: 0,
      right: 0,
      style: {
        bg: 'default',
        border: {
          fg: 'cyan',
          bold : true
        },
        selected: {
          bg : 'blue',
          fg : 'white'
        }
      }
    });

    list.focus();

    var position = 0;

    list.on('keypress', function(ch, key) {
      if (key.name === 'down' && position < server_list.length)
        list.select(++position);
      else if (key.name == 'up' && position > 0)
        list.select(--position);

      var ip = list.value;
      if (!ip) return;
      current_server = ip;
      textbox.setItems(that._stream_buffer[ip].output);
      screen.render();
    });

    list.select(0);

    setInterval(function() {
      list.clearItems();

      server_list.forEach(function(server) {
        var server_str = '';

        if (that._stream_buffer[server.ip].error)
          server_str = chalk.bold.red(server.ip);
        else if (that._stream_buffer[server.ip].finished)
          server_str = chalk.bold.green(server.ip);
        else
          server_str = chalk.bold.blue(server.ip);

        list.pushItem(server_str);
      });

      list.select(position);
      screen.render();
    }, 200);

    var current_server = server_list[0].ip;

    that.log_emitter.on('log', function(data) {
      if (data.ip == current_server) {
        textbox.setItems(that._stream_buffer[current_server].output);
        textbox.scrollTo(that._stream_buffer[current_server].output.length);
      }
    });

    screen.render();
  },
  getLine : function(ip, str) {
    return chalk.red('(' + ip + ')[' + moment().format('LTS') + '] ') + str;
  },
  formatOut : function(ip, str, error) {
    var out = str.split('\n');
    var that = this;

    out.forEach(function(line) {
      if (line.length == 0) return;
      var l = chalk.dim.grey('(' + ip + ')[' + moment().format('LTS') + '] ');
      if (error)
        l += chalk.red(line);
      else
        l += line;
      that.log_emitter.emit('log', {
        ip : ip,
        line : l
      });
      that._stream_buffer[ip].output.push(l);
    });
  },
  exit : function(cb) {
    this.screen.destroy();
    return cb ? cb() : process.exit(0);
  },
  /**
   * Start MultiSSH
   *
   * @param {Object}   opts
   * @param {String}   opts.cmd Command to execute
   * @param {Object[]} opts.server_list List of server
   * @param {String}   [opts.title="MultiSSH"] Window title
   * @param {Boolean}  [opts.auto_exit=false] Skip Ctrl-C wait signal
   *
   */
  start : function(opts, cb) {
    var that = this;

    var cmd          = opts.cmd;
    var server_list  = opts.server_list;
    var window_title = opts.title;

    this._stream_buffer = {};
    this.log_emitter    = new EventEmitter();

    this.initUX(opts);

    this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      that.exit(cb);
    });

    async.forEachLimit(server_list, 20, function(server, next) {
      if (server.state && server.state != 'running') return next();

      that._stream_buffer[server.ip] = {
        output : [],
        error : null,
        finished : false,
        started_at : new Date()
      };

      /**
       * Local Execution
       */
      if (server.local) {
        that.formatOut(server.ip, 'Connected locally to ' + server.ip);
        that.formatOut(server.ip, '$ ' + cmd);
        const child = exec(cmd);

        child.stdout.on('data', function(dt) {
          that.formatOut(server.ip, dt.toString());
        });

        child.stderr.on('data', function(dt) {
          that.formatOut(server.ip, dt.toString());
        });

        child.on('error', function(e) {
          that.formatOut(server.ip, e.message || e, true);
          that._stream_buffer[server.ip].error = e;
          that._stream_buffer[server.ip].finished = true;
          that.formatOut(server.ip, chalk.bold('Command Finished with Error\nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.ip].started_at.getTime()) / 1000)) + 'secs'));
        });

        child.on('close', function(code) {
          that._stream_buffer[server.ip].finished = true;
          that._stream_buffer[server.ip].exit_code = code;
          that.formatOut(server.ip, chalk.bold(' \n \nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.ip].started_at.getTime()) / 1000)) + 'secs\nExit code: ') + (code || 0));
          next();
        });
        return false;
      }

      /**
       * Remote execution
       */
      var ssh_opts = {
        host : server.ip,
        user : server.user
      };

      if (server.key) {
        ssh_opts.key = server.key;
      }

      var stream = sshexec("PS1='$ ' source ~/.bashrc; " + cmd, ssh_opts);

      stream.on('ready', function() {
        that.formatOut(server.ip, 'Connected to ' + server.ip);
        that.formatOut(server.ip, '$ ' + cmd);
      });

      stream.on('warn', function(dt) {
        that.formatOut(server.ip, dt.toString());
      });

      stream.on('data', function(dt) {
        that.formatOut(server.ip, dt.toString());
      });

      stream.on('error', function(e) {
        that.formatOut(server.ip, e.message || e, true);
        that._stream_buffer[server.ip].error = e;
        that._stream_buffer[server.ip].finished = true;
        that.formatOut(server.ip, chalk.bold('Command Finished with Error\nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.ip].started_at.getTime()) / 1000)) + 'secs'));
      });

      stream.on('finish', function(code) {
        that._stream_buffer[server.ip].finished = true;
        that._stream_buffer[server.ip].exit_code = code;
        that.formatOut(server.ip, chalk.bold(' \n \nDuration: ' + (Math.abs(((new Date()).getTime() - that._stream_buffer[server.ip].started_at.getTime()) / 1000)) + 'secs\nExit code: ') + (code || 0));
        next();
      });
    }, function() {
      if (opts.auto_exit === true || process.env.NODE_ENV == 'test')
        that.exit(cb);
    });
  }
};

module.exports = WinMode;

if (require.main === module) {
  WinMode.start([], 'ls');
}
