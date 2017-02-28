var parameters = [
	{
		"name": "toggle_1",
		"type": "bool",
		"value": false
	},
	{
		"name": "value_1",
		"type": "float",
		"min": 0,
		"max": 1,
		"step": 0.01,
		"value": 0
	},
	{
		"name": "value_2",
		"type": "float",
		"min": 0,
		"max": 100,
		"step": 1,
		"value": 50
	},
	{
		"name": "color_1",
		"type": "color",
		"value": "#ff00ff"
	}
]

var clients = 0;

var server = require('http').createServer();
var io = require('socket.io')(server);
io.on('connection', function(client){
	clients++;
	console.log("client connected (currently " + clients + ")");

	// received data event
	client.on('event', function(data) {
		console.log("received event:");
		console.log(data);
	});

	client.on('get_param_list', function(data) {
		console.log("sending parameters list");
		client.emit('param_list',parameters);
	});

	// disconnect event
	client.on('disconnect', function() {
		clients--;
		console.log("client disconnected (currently "+clients+")");
	});

});
server.listen(3000);
console.log("listening on port 3000");
