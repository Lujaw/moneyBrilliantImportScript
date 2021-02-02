const csv = require('csv-parser')
const fs = require('fs')
const { DateTime } = require("luxon");
const stringify = require('csv-stringify');
const R = require('ramda');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const categories = require("./categories.json");


const filename = process.argv.slice(2).join("");
const inputFile = `${__dirname}/${filename}`;
const outputFile = `${filename.split(".")[0]}-converted.csv`;


const requiredHeaders = ["Date","Original Description","Amount","Account Name", "Category"]

const redundandStrings = ["pending: ", " enjoy"]

const convertHeader = (header) => ({
  "transaction date": "Date",
  "description":"Original Description",
  "amount": "Amount",
}[header])

const addNewHeaders = (data, acName = "HSBC") => ({
  ...data,
  "Account Name": acName,
  "Category": categoriseTransactions(data["Original Description"]) || ""
})

const convertToHeaderForCsv = R.reduce((acc, val) => {
  acc.push({id: val, title: val})
  return acc;
}, [])

const convertDateFormat = value => DateTime.fromFormat(value.trim(), "dd MMM yyyy").toFormat("dd/MM/yy")


const containsText = str => (val,key) => R.contains(R.toLower(key), R.toLower(str))

const categoriseTransactions = desc => R.compose(
  R.head,
  R.values,
  R.pickBy(containsText(desc))
)(categories)

const removeRedundantInfo = R.replace(new RegExp(`(${redundandStrings.join("|")})`,"ig"), "")

const shortenDescription = R.compose(
  R.join(" "),
  R.take(7),
  R.split(" "),
  removeRedundantInfo,
  R.trim
)

const  csvWriter = createCsvWriter({
  path: outputFile,
  header: convertToHeaderForCsv(requiredHeaders)
})

const results = [];

fs.createReadStream(inputFile)
  .pipe(csv({
    mapHeaders: ({ header }) => convertHeader(header.trim().toLowerCase()),
    mapValues: ({ header, value }) => {
      if(header === "Date"){
        return convertDateFormat(value)
      }
      if(header === "Original Description"){
        return shortenDescription(value)      
      }
      return value
    }
  }))
  .on('data', (data) => results.push(addNewHeaders(data)))
  .on('end', () => {
    csvWriter.writeRecords(results).then(x => console.log(`file -> "${outputFile}" has been created`))
  });