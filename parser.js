/**
 * Utility script that parses Michelson code into JSON
 */
const fs = require("fs");
const util = require("util");
const { Parser } = require("@taquito/michel-codec");

const code = fs.readFileSync("./src/contract/contract.tez").toString("utf-8");
const p = new Parser();
const data = p.parseScript(code);
const json = JSON.stringify(data, null, 2);

console.log(json);
