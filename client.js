// client
var socket = io();

var my_name = "?";
var my_id = -1;
var joined_game = false;

// dataframe = [player name, mines[], tokens[], level, score] 
var me = -1;		// index for your player in these arrays
var turn = -1;
var buyingPower = [];
var df;

var VP_PER_SPECIAL_CARD = 3;


function init() {
	shuffleCards();
}
function getRndInt(min, max) {
	return Math.floor(Math.random() * ((max+1) - min) ) + min;
}

// Rendering functions
function onclick_newgame() {
	closeMenus();
	document.getElementById("new_game_code").style.visibility = 'visible';
}
function onclick_joingame() {
	closeMenus();
	//document.getElementById("game_code_title").style.visibility = 'visible';
	document.getElementById("join_game_code").style.visibility = 'visible';
	//document.getElementById("form_code").style.visibility = 'visible';
}
function onclick_rules() {
	closeMenus();
	document.getElementById("newRulesScreen").style.visibility = 'visible';
}
function closeMenus() {
	document.getElementById("newgame").style.visibility = 'visible';
	document.getElementById("joingame").style.visibility = 'visible';
	document.getElementById("rules").style.visibility = 'visible';
	document.getElementById("new_game_code").style.visibility = 'hidden';
	document.getElementById("join_game_code").style.visibility = 'hidden';
	//document.getElementById("form_code").style.visibility = 'hidden';
	//document.getElementById("game_code_title").style.visibility = 'hidden';
	document.getElementById("newRulesScreen").style.visibility = 'hidden';
}
function changeName(slot, name) {
	let player = "";
	switch(slot) {
		case 0: player = "name0"; break;
		case 1: player = "name1"; break;
		case 2: player = "name2"; break;
		case 3: player = "name3"; break;
		default:	return;
	}
	document.getElementById(player).innerHTML = name;
	
	// TODO: send update to server or have server call this?
}
function flavor_ItoA(num) {
	switch(num) {
		case 0: return "chocolate";
		case 1: return "ruby";
		case 2: return "emerald";
		case 3: return "sapphire";
		case 4: return "diamond";
	}
}
function renderCard(tier, slot, flavor, cost, vp, variant) {
	// renders a random card of a particular flavor and tier at a particular slot
	let ele = "t"+tier.toString()+"s"+slot.toString();
	let url = "url(img/card/f"+flavor+"t"+tier+"c"+variant+".png)"
	document.getElementById(ele).style.backgroundImage = url;
	
	let cost_txt = "";
	var cost_index = 0;
	for(let c=0; c<5; c++) {
		if(cost[c]>0) {
			cost_txt += "<card_cost class='mc_f"+c.toString()+" mc_s"+cost_index.toString()+"'></card_cost><card_cost_qty class='mc_f"+c.toString()+" mc_s"+cost_index.toString()+"'>"+cost[c].toString()+"</card_cost_qty>";
			cost_index++;
		}
	}
	if(vp>0) {
		cost_txt += "<card_vp>"+vp.toString()+"</card_vp>";
	}
	document.getElementById(ele).innerHTML = cost_txt;	
	
	let eleb = ele+"b";
	url = "url(img/card/bg_"+flavor+".png)"
	document.getElementById(eleb).style.backgroundImage = url;
	
	let elemi = ele+"mi";
	url = "url(img/mine_"+flavor_ItoA(flavor)+"_shadow.png)"
	console.log("T:"+tier.toString()+" S:"+slot.toString()+" F:"+flavor.toString()+" C:"+cost+" MI:"+elemi+" URL:"+url);
	document.getElementById(elemi).style.backgroundImage = url;
	
}
function renderSpecial(slot, flav) {	
	console.log("Special slot: "+slot.toString());
	if(df.pool.special[slot].avail) {
		console.log(flav);
		let sumflav = 0;
		let cntrArr = [];
		let flavArr = [];
		for(let f=0; f<5; f++) {
			sumflav += flav[f];
			if(flav[f]>0) {
				cntrArr.push(flav[f]);
				flavArr.push(f);
			}
		}
		console.log(cntrArr);
		console.log(flavArr);
		
		let minesNeeded = 3;
		if(cntrArr.length == 2) {
			minesNeeded = 4;
		}
		console.log("\tMines needed: "+minesNeeded.toString());
		
		let txt = "";
		for(let x=0; x<cntrArr.length; x++) {
			txt += "<special_mine class='sp_f"+flavArr[x].toString()+" sp_s"+x.toString()+"'></special_mine>";
			
			txt += "<card_cost_qty class='sp_f"+flavArr[x].toString()+" sp_s"+x.toString()+" special_qty'>"+minesNeeded.toString()+"</card_cost_qty>";
		}
		txt += "<card_vp id='special_"+slot.toString()+"_vp'>"+VP_PER_SPECIAL_CARD.toString()+"</card_vp>";

		let ele = document.getElementById("deck_tier"+(slot+1).toString());	// 0 through 2
		ele.innerHTML = txt;
		ele.style.visibility = 'visible';
	}
	else {
		let ele = document.getElementById("deck_tier"+(slot+1).toString());	// 0 through 2
		ele.style.visibility = 'hidden';
	}
}
function shuffleCards() {
	for(let t=1; t<=3; t++) {
		for(let s=1; s<=4; s++) {
			let f = getRndInt(0,4);	// random flavor
			renderCard(t,s,f,[getRndInt(0,4),getRndInt(0,4),getRndInt(0,4),getRndInt(0,4),getRndInt(0,4)],getRndInt(0,4),1);
		}
	}
}
function renderTokens() {
	document.getElementById("tokens_left_chocolate").innerHTML = df.pool.token_supply[0];
	document.getElementById("tokens_left_ruby").innerHTML = df.pool.token_supply[1];
	document.getElementById("tokens_left_emerald").innerHTML = df.pool.token_supply[2];
	document.getElementById("tokens_left_sapphire").innerHTML = df.pool.token_supply[3];
	document.getElementById("tokens_left_diamond").innerHTML = df.pool.token_supply[4];
}
function indicateTurn(turn) {
	document.getElementById('name0').classList.remove('turn');
	document.getElementById('name1').classList.remove('turn');
	document.getElementById('name2').classList.remove('turn');
	document.getElementById('name3').classList.remove('turn');
	
	document.getElementById('name'+turn.toString()).classList.add('turn');
	
	if(turn == my_id) {
		document.getElementById('turnindicator').style.visibility = 'visible';
		document.getElementById('turnindicator').innerHTML = "<p>Your Turn</p><p>actions: "+df.players[my_id].actions.toString()+"/3</p>";
		
		document.getElementById('pass_turn').style.visibility = 'visible';
		
		document.getElementById('grad1').style.visibility = 'hidden';
		document.getElementById('grad2').style.visibility = 'hidden';
		document.getElementById('grad3').style.visibility = 'hidden';
		document.getElementById('grad1b').style.visibility = 'visible';
		document.getElementById('grad2b').style.visibility = 'visible';
		document.getElementById('grad3b').style.visibility = 'visible';
	}
	else {
		document.getElementById('turnindicator').style.visibility = 'hidden';
		document.getElementById('pass_turn').style.visibility = 'hidden';
		
		document.getElementById('grad1').style.visibility = 'visible';
		document.getElementById('grad2').style.visibility = 'visible';
		document.getElementById('grad3').style.visibility = 'visible';
		document.getElementById('grad1b').style.visibility = 'hidden';
		document.getElementById('grad2b').style.visibility = 'hidden';
		document.getElementById('grad3b').style.visibility = 'hidden';
	}
}
function scoreboard() {
	console.log("my ID: "+my_id.toString());
	document.getElementById('token_chocolate').innerHTML = df.players[my_id].tokens[0];
	document.getElementById('token_ruby').innerHTML = df.players[my_id].tokens[1];
	document.getElementById('token_emerald').innerHTML = df.players[my_id].tokens[2];
	document.getElementById('token_sapphire').innerHTML = df.players[my_id].tokens[3];
	document.getElementById('token_diamond').innerHTML = df.players[my_id].tokens[4];
	
	console.log("my ID: "+my_id.toString());
	document.getElementById('mines_chocolate').innerHTML = df.players[my_id].mines[0];
	document.getElementById('mines_ruby').innerHTML = df.players[my_id].mines[1];
	document.getElementById('mines_emerald').innerHTML = df.players[my_id].mines[2];
	document.getElementById('mines_sapphire').innerHTML = df.players[my_id].mines[3];
	document.getElementById('mines_diamond').innerHTML = df.players[my_id].mines[4];
	
	
	for(let p=1; p<=df.players.length; p++) {
		for(let m=1; m<=5; m++) {
			
			document.getElementById('score_p'+p.toString()+'m'+m.toString()).innerHTML = df.players[p-1].mines[m-1];
			
			document.getElementById('score_p'+p.toString()+'g'+m.toString()).innerHTML = df.players[p-1].tokens[m-1];
		}
		
		document.getElementById('score_p'+p.toString()+'vp').innerHTML = df.scores[df.players[p-1].name];
	}
	if(df.players.length<4) {
		for(let p=df.players.length+1; p<=4; p++) {
			for(let m=1; m<=5; m++) {
				document.getElementById('score_p'+p.toString()+'m'+m.toString()).innerHTML = '';
				
				document.getElementById('score_p'+p.toString()+'g'+m.toString()).innerHTML = '';
			}
			
			document.getElementById('score_p'+p.toString()+'vp').innerHTML = '';
			
		}
	}
	
}

// client functions
function parseDataframe(game) {
	df = game;
	console.log(df);
	
	// names update
	for(let p=0; p<df.players.length; p++) {
		changeName(p, df.players[p].name);
		if(df.players[p].name == my_name) {
			my_id = p;
		}
	}
	if(df.players.length < 4) {
		for(let p=df.players.length; p<4; p++) {
			changeName(p, '');
		}
	}
	indicateTurn(df.turn);
	
	// set token stock
	renderTokens();
	
	// render cards
	for(var t=0; t<df.pool.mines.length; t++) {			// size 3 (tiers)
		for(var s=0; s<df.pool.mines[t].length; s++) {	// size 4 (slots)
			renderCard(t+1, s+1, df.pool.mines[t][s].flavor, df.pool.mines[t][s].cost, df.pool.mines[t][s].vp, df.pool.mines[t][s].variant);
		}
	}
		
	// render portrait special cards
	VP_PER_SPECIAL_CARD = df.VP_PER_SPECIAL_CARD;
	renderSpecial(0,df.pool.special[0].req);
	renderSpecial(1,df.pool.special[1].req);
	renderSpecial(2,df.pool.special[2].req);
		
	// update scoreboard
	scoreboard();
	
}
function newGame() {
	try {
		my_name = document.getElementById('form_name').value;
		console.log("My name = "+my_name);
		socket.emit('new_game_code', my_name);
		closeMenus();
	}
	catch(err) {
		console.log(err);
	}
}
function joinGame() {
	try {
		my_name = document.getElementById('form_name2').value;
		console.log("My name = "+my_name);
		socket.emit('join_game_code', my_name);
		closeMenus();
	}
	catch(err) {
		console.log(err);
	}
}
function drawToken(flavor) {
	if(df.turn == my_id) {
		socket.emit('request_token', [my_name, flavor]);
		console.log('drawing a '+flavorToText(flavor)+' token');
	}
	else {
		console.log('Wait for your turn!');
	}
}
function drawcard(tier, slot) {
	if(df.turn == my_id) {
		socket.emit('request_mine', [my_name, tier-1, slot-1]);
	}
	else {
		console.log('Wait for your turn!');
	}
}
function passTurn() {
	if(df.turn == my_id) {
		socket.emit('pass_turn', my_name);
	}
	else {
		console.log('Wait for your turn!');
	}
}

function sumArrays(...arrays) {
  const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
  const result = Array.from({ length: n });
  return result.map((_, i) => arrays.map(xs => xs[i] || 0).reduce((sum, x) => sum + x, 0));
}
function canAfford(tokens,cost) {
	for(let i=0; i<5; i++) {
		if(tokens[i] < cost[i])
			return false;
	}
	return true;
}
function buyMine(tier, slot) {	// called by button press: clicking on mine (during your turn)
	// verify it is your turn
	if(turn == me) {
		
		// verify you can afford this mine
		if(canAfford(buyingPower,buyingPower)) {
			
		}
	}
}



// socket receiving
socket.on('dataframe', (game) => {
	console.log(game);
	parseDataframe(game);
});
socket.on('gameover', (winner) => {
	console.log("winner");
	console.log(winner);
	
	let winner_name = winner[0];
	let winner_score = winner[1];
	
	document.getElementById('turnindicator').style.visibility = 'hidden';
	
	document.getElementById('gameover').style.visibility = 'visible';
	document.getElementById('gameover').innerHTML = 'Game Over</br>Winner: '+winner_name;
});

// shared module
function getRndInt(min, max) {
	return Math.floor(Math.random() * (max - min) ) + min;
}
function randFlavor() {
	return getRndInt(0,5);
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















