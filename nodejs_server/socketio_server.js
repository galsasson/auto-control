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
		"value": "#ffff00ff"
	},
	{
		"name": "string_1",
		"type": "string",
		"value": "This is a sample string, edit it to update"
	}
]

var clients = [];

var server = require('http').createServer();
var io = require('socket.io')(server);
io.on('connection', function(client){
	clients.push(client);
	console.log("client connected (currently " + clients.length + ")");

	client.on('get_param_list', function(data) {
		console.log("sending parameters list");
		client.emit('param_list',parameters);
	});

	client.on('update_param', function(param) {
		// console.log("updating param "+param.name+" with value "+param.value);
		var index;
		for (index=0; index<parameters.length; index++) {
			var p = parameters[index];
			if (p.name == param.name) {
				p.value = param.value;
				break;
			}
		}

		// update other clients
		for (var c=0; c<clients.length; c++) {
			if (clients[c] == client) {
				continue;
			}

			clients[c].emit('update_param', parameters[index]);
		}
	});

	// disconnect event
	client.on('disconnect', function() {
		var index = clients.indexOf(client);
		if (index>-1) {
			clients.splice(index, 1);
		}
		console.log("client disconnected (currently "+clients.length+")");
	});


});
server.listen(3000);
console.log("listening on port 3000");
