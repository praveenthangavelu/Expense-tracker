import { parseAmazon } from './amazonParser.js';
import { parseFlipkart } from './flipkartParser.js';
import { parseMyntra } from './myntraParser.js';
import { parseNykaa } from './nykaaParser.js';
import { parseCroma } from './cromaParser.js';
import { parseTataCliq } from './tatacliqParser.js';
import { parseAjio } from './ajioParser.js';
import { parseMeesho } from './meeshoParser.js';
import { parseSnapdeal } from './snapdealParser.js';

import { parseSwiggy } from './swiggyParser.js';
import { parseZomato } from './zomatoParser.js';
import { parseBigBasket } from './bigBasketParser.js';
import { parseBlinkit } from './blinkitParser.js';
import { parseZepto } from './zeptoParser.js';
import { parseDunzo } from './dunzoParser.js';

import { parseUber } from './uberParser.js';
import { parseOla } from './olaParser.js';
import { parseMakeMyTrip } from './makeMyTripParser.js';
import { parseGoibibo } from './goibiboParser.js';
import { parseCleartrip } from './cleartripParser.js';
import { parseIRCTC } from './irctcParser.js';
import { parseRedBus } from './redBusParser.js';

import { parseNetflix } from './netflixParser.js';
import { parseSpotify } from './spotifyParser.js';
import { parseHotstar } from './hotstarParser.js';
import { parseBookMyShow } from './bookMyShowParser.js';
import { parsePVR } from './pvrParser.js';

import { parseAirtel } from './airtelParser.js';
import { parseJio } from './jioParser.js';
import { parseVodafone } from './vodafoneParser.js';
import { parseACTFibernet } from './actFibernetParser.js';
import { parseHathway } from './hathway.js';

import { parseBESCOM } from './bescomParser.js';
import { parseTataPower } from './tatapowerParser.js';
import { parseAdaniElectricity } from './adaniParser.js';
import { parseMahanagarGas as parseMahangarGas } from './mahangarGasParser.js';

import { parsePharmEasy } from './pharmEasyParser.js';
import { parseNetmeds } from './netmedsParser.js';
import { parse1mg } from './oneMgParser.js';
import { parseCultFit } from './cultFitParser.js';

import { parseSBI } from './banks/sbiParser.js';
import { parseHDFCBank as parseHDFC } from './banks/hdfcParser.js';
import { parseICICIBank as parseICICI } from './banks/iciciParser.js';
import { parseAxisBank as parseAxis } from './banks/axisParser.js';
import { parseKotakBank as parseKotak } from './banks/kotakParser.js';
import { parseCreditCard } from './banks/creditCardParser.js';
import { parseEMI } from './banks/emiParser.js';

import { parseMutualFund } from './investment/mutualFundParser.js';
import { parseZerodha } from './investment/zerodhaParser.js';
import { parseGroww } from './investment/growwParser.js';

import { parseInsurance } from './insurance/insuranceParser.js';
import { parseRentPayment } from './rentParser.js';
import { parseGenericPayment } from './genericParser.js';
import { parsePersonalEmail } from './personalEmailParser.js';

const SENDER_MAP = {
  // E-COMMERCE
  'amazon.in':            parseAmazon,
  'amazon.com':           parseAmazon,
  'flipkart.com':         parseFlipkart,
  'myntra.com':           parseMyntra,
  'nykaa.com':            parseNykaa,
  'croma.com':            parseCroma,
  'tatacliq.com':         parseTataCliq,
  'ajio.com':             parseAjio,
  'meesho.com':           parseMeesho,
  'snapdeal.com':         parseSnapdeal,

  // FOOD DELIVERY
  'swiggy.in':            parseSwiggy,
  'zomato.com':           parseZomato,
  'bigbasket.com':        parseBigBasket,
  'blinkit.com':          parseBlinkit,
  'grofers.com':          parseBlinkit,
  'zepto.co':             parseZepto,
  'dunzo.com':            parseDunzo,

  // TRANSPORT
  'uber.com':             parseUber,
  'olacabs.com':          parseOla,
  'makemytrip.com':       parseMakeMyTrip,
  'goibibo.com':          parseGoibibo,
  'cleartrip.com':        parseCleartrip,
  'irctc.co.in':          parseIRCTC,
  'redbus.in':            parseRedBus,

  // ENTERTAINMENT
  'netflix.com':          parseNetflix,
  'spotify.com':          parseSpotify,
  'hotstar.com':          parseHotstar,
  'disneyplus.com':       parseHotstar,
  'bookmyshow.com':       parseBookMyShow,
  'pvrcinemas.com':       parsePVR,

  // TELECOM / INTERNET
  'airtel.in':            parseAirtel,
  'jio.com':              parseJio,
  'myvi.in':              parseVodafone,
  'vodafone.in':          parseVodafone,
  'actcorp.in':           parseACTFibernet,
  'hathway.com':          parseHathway,

  // UTILITIES
  'bescom.co.in':         parseBESCOM,
  'bescom.org':           parseBESCOM,
  'tatapower.com':        parseTataPower,
  'adanielectricity.com': parseAdaniElectricity,
  'mahanagargas.com':     parseMahangarGas,

  // HEALTH
  'pharmeasy.in':         parsePharmEasy,
  'netmeds.com':          parseNetmeds,
  '1mg.com':              parse1mg,
  'cult.fit':             parseCultFit,

  // BANKS
  'sbi.co.in':            parseSBI,
  'onlinesbi.com':        parseSBI,
  'hdfcbank.com':         parseHDFC,
  'icicibank.com':        parseICICI,
  'axisbank.com':         parseAxis,
  'kotak.com':            parseKotak,
  'kotakbank.com':        parseKotak,

  // INVESTMENTS
  'zerodha.com':          parseZerodha,
  'groww.in':             parseGroww,

  // INSURANCE
  'policybazaar.com':     parseInsurance,
  'acko.com':             parseInsurance,
  'digit.in':             parseInsurance,

  // RENT
  'nobroker.in':          parseRentPayment,
};

export const detectParser = (senderEmail, subject) => {
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase();

  // Check exact domain match
  for (const [domain, parser] of Object.entries(SENDER_MAP)) {
    if (senderDomain?.includes(domain)) {
      return parser;
    }
  }

  // Check subject line for bank/financial keywords
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes('credit card') || subjectLower.includes('card statement')) return parseCreditCard;
  if (subjectLower.includes('emi') || subjectLower.includes('loan')) return parseEMI;
  if (subjectLower.includes('mutual fund') || subjectLower.includes('sip')) return parseMutualFund;
  if (subjectLower.includes('insurance') || subjectLower.includes('premium')) return parseInsurance;
  if (subjectLower.includes('rent') || subjectLower.includes('landlord')) return parseRentPayment;
  if (subjectLower.includes('salary') || subjectLower.includes('credited')) return parseSBI;

  // Personal emails fallback if it contains standard casual text from friends
  if (subjectLower.match(/split|pay|rent|share|transferred|sent|owe|dinner|lunch|bill/i)) {
    return parsePersonalEmail;
  }

  // Fallback
  return parseGenericPayment;
};

export {
  parseAmazon,
  parseFlipkart,
  parseMyntra,
  parseNykaa,
  parseCroma,
  parseTataCliq,
  parseAjio,
  parseMeesho,
  parseSnapdeal,
  parseSwiggy,
  parseZomato,
  parseBigBasket,
  parseBlinkit,
  parseZepto,
  parseDunzo,
  parseUber,
  parseOla,
  parseMakeMyTrip,
  parseGoibibo,
  parseCleartrip,
  parseIRCTC,
  parseRedBus,
  parseNetflix,
  parseSpotify,
  parseHotstar,
  parseBookMyShow,
  parsePVR,
  parseAirtel,
  parseJio,
  parseVodafone,
  parseACTFibernet,
  parseHathway,
  parseBESCOM,
  parseTataPower,
  parseAdaniElectricity,
  parseMahangarGas,
  parsePharmEasy,
  parseNetmeds,
  parse1mg,
  parseCultFit,
  parseSBI,
  parseHDFC,
  parseICICI,
  parseAxis,
  parseKotak,
  parseCreditCard,
  parseEMI,
  parseMutualFund,
  parseZerodha,
  parseGroww,
  parseInsurance,
  parseRentPayment,
  parseGenericPayment,
  parsePersonalEmail,
};
