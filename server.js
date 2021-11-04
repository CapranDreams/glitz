// server
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express();

express.static.mime.define({
    'text/html': ['html']
});
app.use(express.static(__dirname));
const server = http.createServer(app);
const io = socketio(server);



console.log("Starting GLITZ");

// server only functions


// shared module
var unique_id_index = 1;
function gen_id() {
	let id = unique_id_index;
	unique_id_index += 1;
	return id;
}
function getRndInt(min, max) {
	return Math.floor(Math.random() * ((max+1) - min) ) + min;
}
function getRndFromArr(arr) {
	return arr[getRndInt(0, arr.length-1)];
}
function compareArray(a,b) {
	if(a.length != b.length) {
		return false;
	}
	for(let x=0; x<a.length; x++) {
		if(a[x] != b[x]) {
			return false;
		}
	}
	return true;
}
function randFlavor() {
	return getRndInt(0,4);
	// 0: chocolate
	// 1: ruby
	// 2: emerald
	// 3: sapphire
	// 4: diamond
	//~5: gold	(wild) (not generatable through this method)
}
function flavorToText(flavor) {
	if(flavor==0) return "Chocolate";
	else if(flavor==1) return "Ruby";
	else if(flavor==2) return "Emerald";
	else if(flavor==3) return "Sapphire";
	else if(flavor==4) return "Diamond";
	else if(flavor==5) return "Gold";
	else return "Rock";
}
function getMinMaxVariants(tier, flavor) {
	// fill these case statements with the appropriate number of card art variants in the img/card folder
	switch(10*flavor+tier) {
		case 00: return [1,2,3];
		case 01: return [1,2,3];
		case 02: return [1,2,3];
		
		case 10: return [1,2,3,4];
		case 11: return [1,2];
		case 12: return [1,2,3];
		
		case 20: return [1,2,3];
		case 21: return [1,2];
		case 22: return [1,2,3];
		
		case 30: return [1,2,3,4];
		case 31: return [1,2,3];
		case 32: return [1,2,3];
		
		case 40: return [1,2,3,4];
		case 41: return [1,2,3];
		case 42: return [1,2];
		
		default: return [1];
	}
	return [1];
}
class Player {
	constructor(name) {
		this.name = name;
		this.mines = [0,0,0,0,0];
		this.tokens = [0,0,0,0,0];
		this.level = 1;
		this.lastAction1 = -1;
		this.lastAction2 = -1;
		this.startActions = 3;
		this.actions = this.startActions;
	}
	add_mine(mine) {
		this.mines[mine.flavor]++;
	}
	replace_mine(old_mine, new_mine) {	// need to pass this by reference???
		old_mine = new_mine;
	}
	countMines(flavor) {
		let res = 0;
		for(let mine of this.mines) {
			if(mine.getFlavor() == flavor)
				res += 1;
		}
		return res;
	}
	add_token(flavor) {
		this.tokens[flavor] = this.tokens[flavor]+1;
	}
	remove_token(flavor) {
		if(tokens[flavor]>0) {
			this.tokens[flavor] = this.tokens[flavor]-1;
			return true;
		}
		return false; // return false if you don't have enough of that token flavor
	}
	countTokens() {
		return this.tokens.length;
	}
	countToken(flavor) {
		return this.tokens[flavor];
	}
	getLevel() {
		return this.level;
	}
	getMines() {
		return this.mines;
	}
	getTokens() {
		return this.tokens;
	}
	getName() {
		return this.name;
	}
	packMines() {
		let arr = [];
		for(let f=0; f<5; f++) {
			arr.push(this.countMines(f));
		}
		return arr; 
	}
	resetActions() {
		this.actions = this.startActions;
		this.lastAction1 = -1;
		this.lastAction2 = -1;
	}
}
class Special {
	constructor(portrait_num) {
		this.portrait = portrait_num;
		this.req = [0,0,0,0,0];
		this.avail = true;
		
		let bool_type = getRndInt(0,1);
		if(bool_type==1) {	// if 1, then 2 flavors with 4 mines, else 3 flavors with 3 mines
			let flav_1 = getRndInt(0,4)
			let flav_2 = getRndInt(0,4)
			while(flav_2==flav_1) {
				flav_2 = getRndInt(0,4)
			}
			this.req[flav_1]=4;
			this.req[flav_2]=4;
		}
		else {
			let flav_1 = getRndInt(0,4)
			let flav_2 = getRndInt(0,4)
			while(flav_2==flav_1) {
				flav_2 = getRndInt(0,4)
			}
			let flav_3 = getRndInt(0,4)
			while(flav_3==flav_2 || flav_3==flav_1) {
				flav_3 = getRndInt(0,4)
			}
			this.req[flav_1]=3;
			this.req[flav_2]=3;
			this.req[flav_3]=3;
		}
	}
	spEquals(sp) {
		if(this.req[0]==sp.req[0] && this.req[1]==sp.req[1] && this.req[2]==sp.req[2] && this.req[3]==sp.req[3] && this.req[4]==sp.req[4]) {
			return true;
		}
		return false;
	}
}
class Pool {
	constructor() {
		this.mines = [[new Mine(),new Mine(),new Mine(),new Mine()],[new Mine(),new Mine(),new Mine(),new Mine()],[new Mine(),new Mine(),new Mine(),new Mine()]];			// tier array of arrays of mines
		for(let i=0; i<4; i++) {	// 4 mine cards to each tier
			this.replaceMine(0,i);	// tier 1
			this.replaceMine(1,i);	// tier 2
			this.replaceMine(2,i);	// tier 3
		}
		
		this.token_supply = [0,0,0,0,0];
		
		let s1 = getRndInt(0,4);
		let s2 = getRndInt(0,4);
		while(s2==s1) {
			s2 = getRndInt(0,4);
		}
		let s3 = getRndInt(0,4);
		while(s3==s1 || s3==s2) {
			s3 = getRndInt(0,4);
		}
		this.special = [new Special(s1), new Special(s2), new Special(s3)];
		while(this.special[0].spEquals(this.special[1]) || this.special[0].spEquals(this.special[2]) || this.special[1].spEquals(this.special[2])) {
			this.special = [new Special(s1), new Special(s2), new Special(s3)];
		}
	}
	print() {
		console.log("Pool tier 1:");
		let t1 = this.getTier1();
		for(let card in t1) {
			card.print()
		}
		
		console.log("Pool tier 2:");
		let t2 = this.getTier2();
		for(let card in t2) {
			card.print()
		}
		
		console.log("Pool tier 3:");
		let t3 = this.getTier3();
		for(let card in t3) {
			card.print()
		}
	}
	init(stock_size) {
		this.token_supply = [stock_size, stock_size, stock_size, stock_size, stock_size];
	}
	getTier1() {
		return this.mines[0];
	}
	getTier2() {
		return this.mines[1];
	}
	getTier3() {
		return this.mines[2];
	}
	getMine(tier,slot) {
		return this.mines[tier][slot];
	}
	replaceMine(tier,slot) {
		this.mines[tier][slot].genMine(tier);
	}
}
class Mine {
	constructor() {
		this.id = -1;
		this.flavor = -1;
		this.vp = -1;
		this.cost = [0,0,0,0,0];
		this.tier = -1;
		this.slot = -1;
		this.variant = -1;
	}
	print() {
		console.log("Mine: "+flavorToText(this.flavor)+"; VP: "+this.vp+"; cost: "+costToText(this.cost));
	}
	genPrice() {		// set cost and VP based on tier
		var tier = this.tier;
		if(tier == 0) {
			let vp = 0;
			let rndVP = getRndInt(0,100);
			if(rndVP<20)			// 20% chance for card to be worth 1 VP
				vp = 1;
			this.vp = vp;
			
			let price = 4;
			let flavor = -1;
			let cost = [0,0,0,0,0]
			let rndCost = getRndInt(0,100);
			if(rndCost<10) {		// 10% chance for card to cost 3 of same color
				price = 3;
				flavor = randFlavor();
				cost[flavor] = price;
				this.cost = cost;
			}
			else if(rndCost<30)	{ 	// 20% chance for card to cost 5
				price = 5;
				for(;price>0;price--) {
					flavor = randFlavor();
					cost[flavor] = cost[flavor]+1;
				}
				this.cost = cost;
			}
			else { 					// 70% chance for card to cost 4
				price = 4;
				for(;price>0;price--) {
					flavor = randFlavor();
					cost[flavor] = cost[flavor]+1;
				}
				this.cost = cost;
			}
		}
		else if(tier == 1) {
			let vp = 2;		// (2/8)*1vp, (4/8)*2vp, (2/8)*3vp
			
			let flavor = -1;
			let cost = [0,0,0,0,0]
			let rndType = getRndInt(0,100);
			
			if(rndType < 15) { 		// 15% chance for card to cost 6 of same color
				flavor = randFlavor();
				cost[flavor] = 6;
				this.cost = cost;
				this.vp = getRndFromArr([2,2,3,3,3]);
			}
			else if(rndType < 20) { // 5% chance for card to cost 5 of same color
				flavor = randFlavor();
				cost[flavor] = 5;
				this.cost = cost;
				this.vp = 2;
			}
			else if(rndType < 30) { // 10% chance for card to cost 7 from 3 flavors
				let flavor1 = randFlavor();
				let flavor2 = randFlavor();
				while(flavor1 == flavor2) flavor2 = randFlavor();
				let flavor3 = randFlavor();
				while(flavor1 == flavor3 || flavor2 == flavor3) flavor3 = randFlavor();
				cost[flavor1] = 3;
				cost[flavor2] = 2;
				cost[flavor3] = 2;
				this.cost = cost;
				this.vp = getRndFromArr([1,1,2]);
			}
			else if(rndType < 45) { // 15% chance for card to cost 7 from up to 3 flavors
				let flavor1 = randFlavor();
				let flavor2 = randFlavor();
				while(flavor1 == flavor2) flavor2 = randFlavor();
				let flavor3 = randFlavor();
				while(flavor1 == flavor3 || flavor2 == flavor3) flavor3 = randFlavor();
				cost[flavor1] = 3;
				cost[flavor2] = 3;
				cost[flavor3] = 1;
				this.cost = cost;
				this.vp = getRndFromArr([1,2,2,2,2,3]);
			}
			else if(rndType < 60) { // 15% chance for card to cost 8 from up to 3 flavors
				let flavor1 = randFlavor();
				let flavor2 = randFlavor();
				while(flavor1 == flavor2) flavor2 = randFlavor();
				let flavor3 = randFlavor();
				while(flavor1 == flavor3 || flavor2 == flavor3) flavor3 = randFlavor();
				cost[flavor1] = 4;
				cost[flavor2] = getRndInt(2,3,3,3);
				cost[flavor3] = 4-cost[flavor2];
				this.cost = cost;
				this.vp = 3;
			}
			else { // 40% chance for card to cost 7 from up to 3 flavors
				let flavor1 = randFlavor();
				let flavor2 = randFlavor();
				while(flavor1 == flavor2) flavor2 = randFlavor();
				let flavor3 = randFlavor();
				while(flavor1 == flavor3 || flavor2 == flavor3) flavor3 = randFlavor();
				cost[flavor1] = 3;
				cost[flavor2] = 2;
				cost[flavor3] = 2;
				this.cost = cost;
				this.vp = getRndFromArr([1,1,1,2,2,2,2,3,3]);
			}
			
		}
		else if(tier == 2) {
			let cost = [0,0,0,0,0]
			let rndType = getRndInt(0,100);
			
			if(rndType < 25) { 		// 25% chance for card to cost 5:3:3:3 for 3VP
				let flavor1 = randFlavor();
				
				let flavor2 = randFlavor();
				while(flavor2 == flavor1) 
					flavor2 = randFlavor();
				
				let flavor3 = randFlavor();
				while(flavor3 == flavor2 || flavor3 == flavor1) 
					flavor3 = randFlavor();
				
				let flavor4 = randFlavor();
				while(flavor4 == flavor3 || flavor4 == flavor2 || flavor4 == flavor1) 
					flavor4 = randFlavor();
				
				cost[flavor1] = 3;
				cost[flavor2] = 5;
				cost[flavor3] = 3;
				cost[flavor4] = 3;
				this.cost = cost;
				this.vp = 3;
			}
			else if(rndType < 50) { 		// 25% chance for card to cost 7:3 for 5VP
				let flavor1 = randFlavor();
				
				let flavor2 = randFlavor();
				while(flavor2 == flavor1) 
					flavor2 = randFlavor();
				
				cost[flavor1] = 7;
				cost[flavor2] = 3;
				this.cost = cost;
				this.vp = 5;
			}
			else if(rndType < 75) { 		// 25% chance for card to cost 7 for 4VP
				let flavor1 = randFlavor();
				
				cost[flavor1] = 7;
				this.cost = cost;
				this.vp = 4;
			}
			else { 							// 25% chance for card to cost 3:6:3 for 4VP
				let flavor1 = randFlavor();
				
				let flavor2 = randFlavor();
				while(flavor2 == flavor1) 
					flavor2 = randFlavor();
				
				let flavor3 = randFlavor();
				while(flavor3 == flavor2 || flavor3 == flavor1) 
					flavor3 = randFlavor();
				
				cost[flavor1] = 3;
				cost[flavor2] = 6;
				cost[flavor3] = 3;
				this.cost = cost;
				this.vp = 4;
			}
		}
	}
	genMine(tier) {		// generate parameters for random mine
		this.id = gen_id();
		this.flavor = randFlavor();
		let val = this.genPrice(tier)
		this.tier = tier;
		this.genPrice(); // sets cost and VP
		this.variant = getRndFromArr(getMinMaxVariants(this.tier, this.flavor));
	}
	getFlavor() {
		return this.flavor;
	}
	getCost() { 
		return this.cost;
	}
	costToText(cost) {
		let txt = "[";
		txt += this.cost[0] + ":"
		txt += this.cost[1] + ":"
		txt += this.cost[2] + ":"
		txt += this.cost[3] + ":"
		txt += this.cost[4] + "]"
		return txt
	}
	getTier() { 
		return this.tier;
	}
	getVP() { 
		return this.vp;
	}
	getID() { 
		return this.id;
	}
	getSlot() { 
		return this.slot;
	}
	packMine() {
		return [this.flavor, this.cp, this.cost, this.tier, this.slot];
	}
}
class Token {
	constructor(flavor) {
		this.id = gen_id();
		this.flavor = flavor;
	}
	print() {
		console.log("Token: "+flavorToText(this.flavor));
	}
	getFlavor() {
		return this.flavor;
	}
}
class Game {
	constructor() {
		this.scores = {};	// pseudo dictionary
		this.players = [];
		this.pool = new Pool();
		this.playing = true;
		this.turn = 0;
		this.num_players = 0;
		this.max_token_supply = 2;
		this.mark_gameover = ['',14];
		this.VP_PER_SPECIAL_CARD = 2;
		console.log("NEW GAME");
	}
	print() {
		console.log("Game Room: "+this.id+"; players: "+this.players.length+"; turn: "+this.turn);
	}
	connectPlayer(name) {
		this.players.push(new Player(name));
		this.scores[name] = 0;	// add score to dictionary
		this.num_players = this.players.length;
		
		// update max number of tokens
		this.max_token_supply = 2+this.num_players;
		this.pool.init(this.max_token_supply);
	}
	endGame() {
		this.playing = false;
	}
	getScore() {
		// re-organize dict into array
		scores = []
		for(var name in players) {
			scores.push(this.scores[name]);
		}
		return scores;
		// return this.scores;	// return entire dict
	}
	getPlayers() {
		let arr = [];
		for(let p in this.players) {
			arr.push(this.players[p].getName());
		}
		console.log(arr);
		return arr; 
	}
	getTurn() {
		return this.turn;
	}
	getPool() {
		return this.pool;
	}
	getStatus() {
		return this.playing;
	}
	nextTurn() {
		this.turn = (this.turn + 1)%this.players.length;
		//this.sendTurn();
	}
	sendTurn() {
		io.emit('turn',this.turn)
		sendFrame();
	}
	sendFrame() {
		let data = [];
		// [[pool][player name, mines[], tokens[], level, score]]
		
		// also need to pack in pool still... TODO
		
		for(let player in this.players) {
			let datapacket = [];
			datapacket.push(player.getName());	
			datapacket.push(player.packMines());	
			datapacket.push(player.getTokens());
			datapacket.push(player.getLevel());
			datapacket.push(this.scores[player.getName()]);
			data.push(datapacket);
		}
		
		io.emit('frame',data);
	}
}
var game = new Game();

function newgame() {
	game = new Game();
}

io.on('connection', function(sock){
	console.log('new player @ socket id: '+sock.id);
		
	sock.on('new_game_code', (name) => {
		console.log("New game for "+name);
		newgame();
		
		game.connectPlayer(name);
		io.emit('dataframe', game);
	});
	
	sock.on('join_game_code', (name) => {	
		if(game.getPlayers().length < 4) {
			console.log(name+" joined the game");
			game.connectPlayer(name);
			io.emit('dataframe', game);
		}
		else {
			console.log(name+" unable to join game. Too many players.");
		}
	});
		
	sock.on('request_token', data => {
		if(game.mark_gameover[0] == data[0]) {
			io.emit('gameover', game.mark_gameover);	
		}
		
		let name = data[0];
		let flavor = data[1];
		console.log(name+' requested a '+flavor.toString()+' token');
		if(game.pool.token_supply[flavor] > 0) {
			var gameplayer;
			for(var p=0; p<game.players.length; p++) {
				if(game.players[p].name == name) {
					gameplayer = p;
				}
			}
			//console.log("actions: "+game.players[gameplayer].actions.toString());
			//console.log("flavor: "+flavor.toString());
			//console.log("last flavor1: "+game.players[gameplayer].lastAction1.toString());
			//console.log("last flavor2: "+game.players[gameplayer].lastAction2.toString());
			
			
			// end turn if at 10 tokens total
			let sumtokens = game.players[gameplayer].tokens[0] + game.players[gameplayer].tokens[1] + game.players[gameplayer].tokens[2] + game.players[gameplayer].tokens[3] + game.players[gameplayer].tokens[4];
			if(sumtokens >= 10) {
				game.players[gameplayer].resetActions();
				game.nextTurn();
				io.emit('dataframe', game);	
			}
			else {
				// if this is the first token of the same flavor this turn
				if(game.players[gameplayer].lastAction1 == flavor || game.players[gameplayer].lastAction2 == flavor) {
					// 2nd token of same flavor (only allowed on 2nd token draw)
					if(game.players[gameplayer].actions == game.players[gameplayer].startActions-1) {
						//console.log("2nd token of same flavor");
						game.players[gameplayer].tokens[flavor]++;
						game.pool.token_supply[flavor]--;
						
						game.players[gameplayer].resetActions();
						game.nextTurn();
						io.emit('dataframe', game);	
					}
					// attempted to draw a same flavor token after already drawing 2 tokens
					else {
						console.log("not allowed to draw tokens in this order");
					}
				}
				// you have more than one action left
				else if(game.players[gameplayer].actions > 1) {
					game.players[gameplayer].tokens[flavor]++;
					game.pool.token_supply[flavor]--;
					
					//console.log("this is the first token of the same flavor this turn");
					game.players[gameplayer].actions--;
					game.players[gameplayer].lastAction2 = game.players[gameplayer].lastAction1;
					game.players[gameplayer].lastAction1 = flavor;
					
					io.emit('dataframe', game);	
				}
				// this is your last action
				else {	
					//console.log("this is your last action");
					game.players[gameplayer].tokens[flavor]++;
					game.pool.token_supply[flavor]--;
					
					game.players[gameplayer].resetActions();
					game.nextTurn();
					io.emit('dataframe', game);	
				}
			}
		}
	});

	sock.on('request_mine', data => {	
		if(game.mark_gameover[0] == data[0]) {
			io.emit('gameover', game.mark_gameover);	
		}
	
		let name = data[0];
		let tier = data[1];
		let slot = data[2];
		
		console.log(data);
		
		var gameplayer;
		for(var p=0; p<game.players.length; p++) {
			if(game.players[p].name == name) {
				gameplayer = p;
			}
		}
		
		if(game.players[gameplayer].actions == game.players[gameplayer].startActions) {
			let card_cost = game.pool.mines[tier][slot].cost;
			let your_coins = game.players[gameplayer].tokens;
			let your_mines = game.players[gameplayer].mines;
			let eff_cost = [9,9,9,9,9];
						
			let can_afford = true;
			for(let f=0; f<5; f++) {
				eff_cost[f] = Math.max(0,card_cost[f]-your_mines[f]);
				if(eff_cost[f]>your_coins[f]) {
					can_afford = false;
				}
			}
			
			if(can_afford) {
				let flav = game.pool.mines[tier][slot].flavor;
				
				// subtract cost from player's tokens
				for(let f=0; f<5; f++) {
					game.players[gameplayer].tokens[f] -= eff_cost[f];
					game.pool.token_supply[f] += eff_cost[f];
				}
				game.players[gameplayer].mines[flav]++;
				game.scores[name] += game.pool.mines[tier][slot].vp;
				
				// generate a new mine card in that spot
				game.pool.mines[tier][slot].genMine(tier);
				
				game.players[gameplayer].resetActions();
				game.nextTurn();
				io.emit('dataframe', game);	
				
				if(game.scores[name] > game.mark_gameover[1]) {
					game.mark_gameover = [name,game.scores[name]];
				}
			}
		}
		
		// check for special mines
		let a = game.players[gameplayer].mines;
		let b = [];
		var flag = true;
		for(var y=0; y<3; y++) {
			b = game.pool.special[y].req;	// special card
			flag = true;
			for(let x=0; x<5; x++) {
				if(a[x] < b[x]) {
					flag = false;
				}
			}
			if(flag && game.pool.special[y].avail) {
				console.log("Acquired specialty: "+y.toString());
				game.scores[name] += game.VP_PER_SPECIAL_CARD;
				game.pool.special[y].avail = false;
				io.emit('dataframe', game);	
			}
		}
		
	});
	
	sock.on('pass_turn', name => {	
		console.log("Pass turn: "+name);
		
		var gameplayer;
		for(var p=0; p<game.players.length; p++) {
			if(game.players[p].name == name) {
				gameplayer = p;
			}
		}
		
		game.players[gameplayer].resetActions();
		game.nextTurn();
		io.emit('dataframe', game);	
	});
});

server.on('error', (err) => {
	console.error('Server error:', err);
});

server.listen(8105, () => {
	console.log('Glitz started on 8105');
});










