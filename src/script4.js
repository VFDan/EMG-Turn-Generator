var stats;
var defaultSel = "Select a country:";
var sel = defaultSel;
var incomes = [];
var mouseDown = null;
var statsCost = {"factories": 500, "infantry": 0.05, "tanks": 90, "fighters": 30, "bombers": 40, "battleships": 180, "submarines": 200, "forts": 400};
var statsList = {"plural":   ["Factories", "Infantry", "Tanks", "Fighters", "Bombers", "Battleships", "Submarines", "Forts"],
                 "singular": ["Factory", "Infantry", "Tank", "Fighter", "Bomber", "Battleship", "Submarine", "Fort"]}

function replaceBulk( str, findArray, replaceArray ){
    var i, regex = [], map = {}; 
    for( i=0; i<findArray.length; i++ ){ 
      regex.push( findArray[i].replace(/([-[\]{}()*+?.\\^$|#,])/g,'\\$1') );
      map[findArray[i]] = replaceArray[i]; 
    }
    regex = regex.join('|');
    str = str.replace( new RegExp( regex, 'g' ), function(matched){
      return map[matched];
    });
    return str;
  }

async function init() {
	var startTime = Date.now();
    do {
        response = await fetch("./stats.json?nocache=" + Math.random());
        stats = await response.json();
    } while (stats == undefined);
    populateStats();
    if (Date.now() - startTime < 2000) {
        setTimeout(fadeOutLoading(), 2000); // Timeout so loading doesn't immediately disappear
    } else fadeOutLoading();
}
function fadeOutLoading() {
    var fadeTarget = document.getElementById("loading");
    fadeTarget.style.opacity = 0;
    setTimeout(function(){fadeTarget.style.display = 'none';}, 900);
}
init();
function populateStats() { 
    document.getElementById("country_select").innerHTML += `<option disabled selected>${defaultSel}</option>`;
	for(country in stats.countries) {
		document.getElementById("country_select").innerHTML += `<option name="${country}">${country}</option>`;
	};
}

function toggleSvg(ele, type) {
    var svgElement = ele.parentElement.querySelector('svg');
    var toggledClass = "rotate-180";
    if (type=="click") {
        if (svgElement.classList.contains(toggledClass)) {
            svgElement.classList.remove(toggledClass);
        } else {
            svgElement.classList.add(toggledClass);
        }
    } else if (type=="focus") {
        if(mouseDown != ele) {
            svgElement.classList.add(toggledClass);
        }
    } else if (type=="blur") {
        if(mouseDown != ele) {
            svgElement.classList.remove(toggledClass);
        }
    }
}

function countrySelect() {
    sel = document.getElementById('country_select').value;
    if (sel != defaultSel) { 
        document.getElementById("copy").removeAttribute("disabled");
        document.getElementById("incomebutton").removeAttribute("disabled");
        updateOutput();
    } else {
        document.getElementById("copy").setAttribute("disabled", "true");
        document.getElementById("incomebutton").setAttribute("disabled", "true");
        document.getElementById("output").innerHTML = "How'd you even get here? You gotta select a country mate."
    }
    toggleSvg(document.getElementById('country_select'), 'blur');
}

var templateHeaders = ['**{0} [Turn {1}]{2}**\n', '\n__Incomes__\n' /*Not required*/, '\n__Expenses__\n' /*Technically not required*/, '\n__Economy__\n', '\n__Values__\n'];
var templateIncomes = '£{0} from {1}';
var templateExpenses = `£{0} for {1} {2}\n`
var templateEconomy = `Budget: £{0}{*}
Expenses: £{1}
New balance: £{2}\n`;
var templateIncome = '\nIncomes: £{0}' //CHANGE!
var templateValues = `New amount of Factories: {1}
New amount of Infantry (sans degradation): {2}
New amount of Tanks: {3}
New amount of Fighters: {4}
New amount of Bombers: {5}
New amount of Battleships: {6}
New amount of Submarines: {7}
New amount of Forts: {8}`;

function updateOutput() {
    sel = document.getElementById('country_select').value;
    if (sel == defaultSel) {
        document.getElementById("copy").setAttribute("disabled", "true");
        document.getElementById("output").innerHTML = "Select a country before continuing."
    } else {
        var selStats = [...stats.countries[sel]]; //"Factory", "Infantry", "Tank", "Fighter", "Bomber", "Battleship", "Submarine", "Fort", "Budget"
        var selFlag = stats.flag[sel]
        var outputString = "";

        returnedStats = calcStats(selStats);

        /* INCOME STUFF HERE */
        var incomeGains = 0;

        //Header (MANDATORY!)
        outputString += replaceBulk(templateHeaders[0], ["{0}","{1}","{2}"], [sel, stats.turn, (selFlag?" "+selFlag:"")]);

        //Incomes 


        //Expenses
        if (JSON.stringify(selStats) != JSON.stringify(returnedStats)) {
            outputString += templateHeaders[2];
            var arrPos = -1;
            for (let stat in statsCost) {
                arrPos++;
                if (selStats[arrPos] != returnedStats[arrPos]) {
                    let difference = returnedStats[arrPos] - selStats[arrPos];
                    let expenseInOutput = replaceBulk(templateExpenses, ["{0}", "{1}"], [difference*statsCost[stat], difference])
                    if (difference == 1) {
                        expenseInOutput = expenseInOutput.replace("{2}", statsList["singular"][arrPos]);
                    } else {
                        expenseInOutput = expenseInOutput.replace("{2}", statsList["plural"][arrPos]);
                    }
                    outputString += expenseInOutput; 
                }
            }
        }

        //Economy (MANDATORY!)
        outputString += templateHeaders[3];
        let economyOutput = templateEconomy;
        if (incomeGains != 0) {
            economyOutput = economyOutput.replace("{*}", templateIncome.replace("{0}", incomeGains));
        } else {
            economyOutput = economyOutput.replace("{*}", "");
        }
        var expenses = selStats[selStats.length-1] - returnedStats[returnedStats.length - 1];
        var remainingCash = returnedStats[returnedStats.length - 1] + incomeGains;
        outputString += replaceBulk(economyOutput, ["{0}", "{1}", "{2}"], [selStats[selStats.length-1], expenses, remainingCash])

        
        //Values (MANDATORY!)
        outputString += templateHeaders[4];
        var R = returnedStats;
        outputString += replaceBulk(templateValues, 
                                    ["{1}", "{2}", "{3}", "{4}", "{5}", "{6}", "{7}", "{8}"],
                                    [R[0],  R[1],  R[2],  R[3],  R[4],  R[5],  R[6],  R[7]])



        document.getElementById("output").innerHTML = outputString;


        if (remainingCash < 0) {
            document.getElementById("copy").setAttribute("disabled", "true");
            document.getElementById("money-warning").classList.remove("hidden")
        } else {
            document.getElementById("copy").removeAttribute("disabled");
            document.getElementById("money-warning").classList.add("hidden")
        }
    }
}

function calcStats(originalStats) {
    var newStats = [...originalStats];
    let statPos = -1;
    for (const stat in statsCost) {
        let statVal = parseInt(document.getElementById(stat).value || 0);
        statPos++;
        if (statVal == 0) {
            continue;
        } else {
            newStats[statPos] += statVal;
            newStats[newStats.length - 1] -= statVal * statsCost[stat];
        }
    }
    return newStats;
}

var incomeHTML = `<div id="income{#}">
`;

function newIncome() {

}

document.getElementById("incomebutton").onkeydown = function(e){if(e.key == ' '||e.code == 'Space'||e.keyCode==32||e.key=='Enter'||e.code=='Enter'||e.keyCode==32){newIncome();}}