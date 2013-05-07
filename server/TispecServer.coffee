express = require 'express'
specs   = require './routes/specs'
http    = require 'http'
path    = require 'path'

class TispecServer
  constructor: () ->
    app = express()

    # all environments
    app.set('port', process.env.PORT || 8666);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, '/public')));

    # development only
    app.use(express.errorHandler()) if 'development' is app.get('env')

    app.get('/',      specs.list);
    app.get('/specs', specs.list);

    http.createServer(app).listen(app.get('port'), ->
      console.log('Server listening on port ' + app.get('port'))
    )

exports.TispecServer = TispecServer;