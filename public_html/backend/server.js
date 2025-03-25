const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const moment = require('moment');

const app = express();
const PORT = 16067;
const server = http.createServer(app);
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: "https://lehre.bpm.in.tum.de/ports/16068",
  methods: "GET",
  credentials: true,
  allowedHeaders: "Content-Type"
}));
// File paths for logging and instance tracking
const instanceFilePath = path.join(__dirname, 'newData.json');
// Utility functions
const readJsonFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    return [];
  }
};

const REQUIRED_FILES = {
  checkFiles1: ['a4.json', 'a5.json', 'a6.json'],
  checkFiles2: ['a10.json', 'a11.json', 'a12.json', 'a17.json'],
  checkFiles3: ['a18.json'],
  checkFiles4: ['a27.json']

};
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`File updated successfully: ${filePath}`);
  } catch (err) {
    console.error('Error writing JSON file:', err.message);
    throw err;
  }
};
// Save json file
const saveJsonToFile = (instanceId, activity, jsonData) => {
  const instanceIdStr = String(instanceId);
  const instanceFilePath = path.join(__dirname, 'newData.json');
  const instanceData = readJsonFile(instanceFilePath); // Read instance data

  if (!instanceIdStr || !activity) {
    console.error('Instance ID or Activity is missing. Cannot save JSON file.');
    return;
  }

  // Check if instanceId exists in newData.json
  const exists = instanceData.some(entry => entry.initInstanceId === instanceIdStr);

  if (!exists) {
    console.log(`Skipping writing event: instanceId ${instanceIdStr} not found in newData.json`);
    return;
  }

  console.log(`InstanceId ${instanceIdStr} found. Proceeding with writing data.`);

  const instanceFolderPath = path.join(__dirname, 'instanceData', instanceIdStr);
  const activityFilePath = path.join(instanceFolderPath, `${activity}.json`);

  // Ensure instance folder exists
  try {
    if (!fs.existsSync(instanceFolderPath)) {
      fs.mkdirSync(instanceFolderPath, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating instance folder:', error.message);
    return;
  }

  // Write data to activity.json file
  try {
    fs.writeFileSync(activityFilePath, JSON.stringify(jsonData, null, 2));
    console.log(`Saved data to: ${activityFilePath}`);
  } catch (error) {
    console.error('Error writing JSON file:', error.message);
  }
};

// Process to get running & other instance IDs
const getInstanceData = () => {
  const instances = readJsonFile(instanceFilePath);

  if (!instances.length) {
    return { runningInstanceIds: [], otherInstanceIds: [] };
  }

  // Sort instances by timestamp (latest first)
  const sortedInstances = instances.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Get the two most recent instances as runningInstanceIds
  const runningInstanceIds = sortedInstances.slice(0, 2);

  // The rest go into otherInstanceIds
  const otherInstanceIds = sortedInstances.slice(2);

  return { runningInstanceIds, otherInstanceIds };
};

// Store file index per instance to track last served file
const fileIndexes = {};

//=== Function to distribute a total value turbines 
function distributeTurbineValues(total) {
  if (total === 0) return [0, 0, 0, 0]; 

  let turbine1 = Math.round(total / 10);
  let turbine2 = Math.round((total - turbine1) / 5);
  let turbine3 = Math.round((total - turbine1 - turbine2) / 3);
  let turbine4 = total - turbine1 - turbine2 - turbine3; 

  return [turbine1, turbine2, turbine3, turbine4];
}

// ----------------- Endpoints -----------------
// Get the current and next UTC day formatted as YYYY-MM-DDT00
const getUTCDates = () => {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0] + "T00"; // Today at 00:00 UTC
  now.setUTCDate(now.getUTCDate() + 1);
  const endDate = now.toISOString().split("T")[0] + "T00"; // Tomorrow at 00:00 UTC
  now.setUTCDate(now.getUTCDate() - 3);
  const startData = now.toISOString().split("T")[0] + "T00"; // Today at 00:00 UTC
  now.setUTCDate(now.getUTCDate() + 1);
  const endData = now.toISOString().split("T")[0] + "T00"; // Today at 00:00 UTC
  return { startDate, endDate, startData, endData };
};
// Endpoint 0: Initialize an Instance ID
app.post('/api/initInstanceId', async (req, res) => {
  const { initInstanceId } = req.body;

  if (!initInstanceId) {
    return res.status(400).json({ error: 'Missing required parameter: initInstanceId' });
  }

  const initInstanceIds = Array.isArray(initInstanceId) ? initInstanceId : [initInstanceId];
  const data = readJsonFile(instanceFilePath);

  initInstanceIds.forEach((id) => {
    const existingEntry = data.find(entry => entry.initInstanceId === id);
    if (existingEntry) {
      existingEntry.timestamp = new Date().toISOString();
    } else {
      data.push({ initInstanceId: id, timestamp: new Date().toISOString() });
    }

     // **Create the instance folder here**
     const instanceFolderPath = path.join(__dirname, 'instanceData', id);

     try {
       if (!fs.existsSync(instanceFolderPath)) {
         fs.mkdirSync(instanceFolderPath, { recursive: true });
         console.log(`Created instance folder: ${instanceFolderPath}`);
       }
     } catch (error) {
       console.error(`Error creating folder for ${id}:`, error.message);
     }
   });
 
   try {
     writeJsonFile(instanceFilePath, data);
     res.status(200).json({ message: 'Data updated successfully', data });
   } catch (err) {
     console.error('Failed to write data:', err.message);
     res.status(500).json({ error: 'Failed to update data' });
   }     
  });

// Endpoint 1: Get Weather Data
app.get('/api/getWeather', async (req, res) => {
  try {
    const { city } = req.query;

    if (!city) {
      return res.status(400).json({ status: 'Error', message: 'Missing city or instanceId' });
    }

    const weatherApiKey = 'b877a11af80a4673b2b234205242011';
    const weatherResponse = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
      params: { key: weatherApiKey, q: city, days: 1 }
    });
    const todayDate = moment.utc().format("YYYY-MM-DD");
    const currentHour = moment.utc().hour(); // Get the current hour in UTC
    const data = weatherResponse.data;
    const weatherData = {
      location: data.location.name,
      country: data.location.country,
      localtime: data.location.localtime,
      current: {
        lastupdated: data.current.last_updated,
        cur_temperature: data.current.temp_c,
        condition: {
          text: data.current.condition.text,
          icon: data.current.condition.icon,
        },
        cur_windspeed: data.current.wind_kph,
        cur_cloudCover: data.current.cloud,
      },
      forecast: data.forecast.forecastday.map(day => ({
        date: day.date,
        srise: day.astro.sunrise,
        sset: day.astro.sunset,
        hourly: day.hour.map(hour => ({
          t: moment(hour.time, 'YYYY-MM-DDTHH').format('HH:00'),
          temp: hour.temp_c,
          wid: hour.wind_kph,
          cld: hour.cloud
        })).filter(hour => {
          const entryHour = moment.utc(todayDate + " " + hour.t, "YYYY-MM-DD HH:00").hour();
          //  const currentHour = moment.utc(todayCurrentHour, "YYYY-MM-DD HH:00").hour();
          return entryHour <= currentHour;
        })
      }))
    };

    res.json({
      status: 'Success',
      data: weatherData,
      currentWindSpeed: data.current.wind_kph
    });
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

// Endpoint 2: Get Electricity Demand
app.get('/api/getElectricityDemand', async (req, res) => { 
  try {
    const { startData, endData } = getUTCDates();
    const city = req.query.city;
    const electronicApiKey = '0wmz6SKcqfVQgr67QeNFsHLMsZh7yBw58EuJfkqO';

    const demandResponse = await axios.get('https://api.eia.gov/v2/electricity/rto/region-data/data/', {
      params: {
        api_key: electronicApiKey,
        frequency: 'hourly',
        start: startData,
        end: endData,
        'facets[respondent][]': city,
        'data[]': 'value',
        'facets[type][]': ['D', 'DF'],
        'sort[0][column]': 'period',
        'sort[0][direction]': 'asc'
      }
    });

    const electricityDemandResponse = demandResponse.data.response;
    const currentHour = moment.utc().hour(); // Get current UTC hour
    const twoDaysAgo = moment.utc().startOf('day').subtract(2, 'days');

    // Filter only data from two days ago up to the current UTC hour
    let hourlyData = electricityDemandResponse.data
      .filter(entry => moment.utc(entry.period, 'YYYY-MM-DDTHH').isSame(twoDaysAgo, 'day'))
      .map(entry => ({
        p: moment.utc(entry.period, 'YYYY-MM-DDTHH').format('HH:00'), // Extract hour
        tp: entry.type, // Type (D or DF)
        vl: parseFloat(entry.value) // Convert value to float
      }))
      .filter(entry => moment.utc(entry.p, 'HH:00').hour() <= currentHour);

    // Find the latest D (currDemand) and DF (foreDemand)
    let latestD = [...hourlyData].reverse().find(entry => entry.tp === 'D') || { vl: 0 };
    let latestDF = [...hourlyData].reverse().find(entry => entry.tp === 'DF') || { vl: 0 };

    res.json({
      status: 'Success',
      currDemand: latestD.vl,
      foreDemand: latestDF.vl,
      data: {
        hourlyData
      }
    });
  } catch (error) {
    console.error('Error fetching electricity demand data:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

// Endpoint 3: Get Electricity Generation
app.get('/api/getElectricityGeneration', async (req, res) => {
  try {
    const { startData, endData } = getUTCDates();
    const electronicApiKey = '0wmz6SKcqfVQgr67QeNFsHLMsZh7yBw58EuJfkqO';
    const city = req.query.city;
 

    // Extract turbine status values from query params, correctly handling 0
    const turbine1 = req.query.turbine1 !== undefined ? Number(req.query.turbine1) : 1;
    const turbine2 = req.query.turbine2 !== undefined ? Number(req.query.turbine2) : 1;
    const turbine3 = req.query.turbine3 !== undefined ? Number(req.query.turbine3) : 1;
    const turbine4 = req.query.turbine4 !== undefined ? Number(req.query.turbine4) : 1;

    const generationResponse = await axios.get('https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/', {
      params: {
        api_key: electronicApiKey,
        frequency: 'hourly',
        start: startData,
        end: endData,
        'facets[respondent][]': city,
        'data[]': 'value',
        'sort[0][column]': 'period',
        'facets[fueltype][]': [ 'COL', 'NG', 'NUC', 'SUN', 'WAT', 'WND'], 
        'sort[0][direction]': 'asc'
      }
    });

    const electricityGenResponse = generationResponse.data.response;
    const currentHour = moment.utc().format("HH:00");
    const todayDate = moment.utc().format("YYYY-MM-DD");
    const todayCurrentHour = `${todayDate} ${currentHour}`;

    let hourlyData = electricityGenResponse.data
      .filter(entry => {
        const entryDate = moment.utc(entry.period, 'YYYY-MM-DDTHH');
        const twoDaysAgo = moment.utc().startOf('day').subtract(2, 'days');
        return entryDate.isSame(twoDaysAgo, 'day'); // Get only twoDaysAgo's data
      })
      .map(entry => ({
        p: moment.utc(entry.period, 'YYYY-MM-DDTHH').format('HH:00'),
        fu: entry['type-name'],
        vl: parseFloat(entry.value),
      }))
      .filter(entry => {
        const currentHourUTC = moment.utc().hour();
        const entryHour = moment.utc(entry.p, 'HH:00').hour();
        return entryHour <= currentHourUTC;
      });

    // Find the latest entry for Wind
    let latestWindEntry = [...hourlyData].reverse().find(entry => entry.fu === "Wind");
    const latestVl = latestWindEntry ? latestWindEntry.vl : 0; // If no Wind entry found, set to 0

    // Find the latest period (latest 'p' value)
    const latestPeriod = Math.max(...hourlyData.map(entry => moment(entry.p, "HH:00").valueOf()));
    const latestP = moment(latestPeriod).format("HH:00");

    // Filter only entries that match the latest period
    const latestEntries = hourlyData.filter(entry => entry.p === latestP);

    // Compute total energy generation for that latest period
    const totalEnergyGenByAllFuel = latestEntries.reduce((sum, entry) => sum + entry.vl, 0);

    let turbineValues = distributeTurbineValues(latestVl);
    const turbineStatuses = [turbine1, turbine2, turbine3, turbine4];

    let turArray = turbineValues.map((val, index) => ({
      turId: index + 1,
      vl: val,
      stt: turbineStatuses[index] // Directly assign from array
    }));

    res.json({
      status: 'Success',
      currEnergyGenByWind: latestVl,
      totalEnergyGenByAllFuel: totalEnergyGenByAllFuel,
      data: {
        totalRecords: electricityGenResponse.total,
        currentHour: todayCurrentHour,
        frequency: electricityGenResponse.frequency,

        hourlyData,
        turbines: {
          hour: latestWindEntry ? latestWindEntry.p : todayCurrentHour,
          turb: turArray
        }
      }
    });
  } catch (error) {
    console.error('Error fetching electricity generation data:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

//Endpoint 4: Compare WindSpeed and Energy
app.get('/api/checkWindEnergy', async (req, res) => {
  try {
    const currEnergyGenByWind = parseFloat(req.query.currEnergyGenByWind) || 0;
    const currWindSpeed = parseFloat(req.query.currWindSpeed) || 0;
    const result = (currEnergyGenByWind === 0 || currWindSpeed === 0) ? 1 : 0;

    // Send response
    res.json(result);
  } catch (error) {
    console.error('Error processing wind energy check:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

//Endpoint 5: Compare Fuel and demand
app.get('/api/checkFuelDemand', async (req, res) => {
  try {
    const currDemand = parseFloat(req.query.currDemand) || 0;
    const totalEnergyGenByAllFuel = parseFloat(req.query.totalEnergyGenByAllFuel) || 0;
    const result = (totalEnergyGenByAllFuel > currDemand) ? 1 : 0;

    // Send response
    res.json(result);
  } catch (error) {
    console.error('Error processing Fuel Demand check:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
});
//Endpoint 6: Compare Turbine Values against the total EGeneration
app.get('/api/checkTurbine', async (req, res) => {
  try {
    const turbineIdValue = parseFloat(req.query.turbineIdValue) || 0;
    const currEnergyGenByWind = parseFloat(req.query.currEnergyGenByWind) || 0;
    const threshold = currEnergyGenByWind / 4;
    const updatedStatus = turbineIdValue >= threshold ? 1 : 0;

    // Send response
    res.json({updatedStatus, turbineIdValue});
  } catch (error) {
    console.error('Error processing Turbine check:', error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
}); 

//Endpoint 6.1: Shut it down
app.get('/api/enableTurbines', async (req, res) => {
  try {
    const enable = Number(req.query.enable);

    // Send response
    res.json(enable);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ status: 'Error', message: error.message });
  }
}); 

//Endpoint 7: Get Instance Ids
app.get("/api/instances", (req, res) => {
  try {
    const result = getInstanceData();
    res.json(result);
  } catch (error) {
    console.error("Error processing data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint 8: API to read files for a given instanceId
app.get("/api/readFile/:instanceId", (req, res) => {
  const instanceId = String(req.params.instanceId);
  //const instanceFolderPath = path.join(__dirname, "instanceData", instanceId, "archived");
  const archivedFolderPath = path.join(__dirname, "instanceData", instanceId, "archived");
  const instanceFolderPath = path.join(__dirname, "instanceData", instanceId);

  console.log(`🔎 Checking folder: ${archivedFolderPath}`);
  let files = [];

  // Ensure the folder exists
  if (fs.existsSync(archivedFolderPath)) {
    console.log(`✔️ Archived folder found: ${archivedFolderPath}`);
    files = fs.readdirSync(archivedFolderPath).filter(file => file.endsWith(".json"));
    // return res.status(404).json({ error: `Archived folder for instance ${instanceId} not found` });
  } else {
    console.warn(`⚠️ Archived folder not found. Reading files directly from instance folder: ${instanceFolderPath}`);
    // Get all JSON files in the instance folder if archived folder doesn't exist
    files = fs.readdirSync(instanceFolderPath).filter(file => file.endsWith(".json"));
  }

  // Get all JSON files in the folder
  if (files.length === 0) {
    console.warn(`⚠️ No JSON files found in: ${archivedFolderPath || instanceFolderPath}`);
    return res.json({ message: `No JSON files found for instance ${instanceId}` });
  }

  let structuredResponse = {
    instanceId: instanceId,
    weatherResponses: [],
    generationResponses: [],
    demandResponses: []
  };

  try {
    files.forEach((file) => {
      const filePath = fs.existsSync(archivedFolderPath) ? path.join(archivedFolderPath, file) : path.join(instanceFolderPath, file);
      let fileContent;

      // Ensure JSON is parsed safely
      try {
        fileContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (error) {
        console.error(`❌ Error reading ${file}:`, error.message);
        return; // Skip this file if it's invalid
      }

      // Categorize responses
      if (fileContent?.content?.values?.weatherResponses) {
        structuredResponse.weatherResponses.push(fileContent.content.values.weatherResponses);
      }
      if (fileContent?.content?.values?.generationResponses) {
        structuredResponse.generationResponses.push(fileContent.content.values.generationResponses);
      }
      if (fileContent?.content?.values?.demandResponses) {
        structuredResponse.demandResponses.push(fileContent.content.values.demandResponses);
      }
    });

    res.json(structuredResponse);
  } catch (error) {
    console.error(`❌ Error processing files for ${instanceId}:`, error.message);
    res.status(500).json({ error: `Error processing files for instance ${instanceId}` });
  }
});

// Endpoint 9: Endpoint to check file availability
app.get('/api/checkFiles', (req, res) => {
  try {
      const { initInstanceId, type } = req.query;

      if (!initInstanceId || !type) {
          return res.status(400).json({ status: 'Error', message: 'Missing initInstanceId or type in request' });
      }

      if (!REQUIRED_FILES[type]) {
          return res.status(400).json({ status: 'Error', message: 'Invalid type provided' });
      }
 
      const instanceFolderPath = path.join(__dirname, 'instanceData', initInstanceId);

      if (!fs.existsSync(instanceFolderPath)) {
          return res.json({ status: 1, message: 'Instance folder does not exist.' });
      }

      const files = new Set(fs.readdirSync(instanceFolderPath));
      const requiredSet = new Set(REQUIRED_FILES[type]);

      const allFilesExist = [...requiredSet].every(file => files.has(file));
      const result = allFilesExist ? 0 : 1;
      return res.json(result);

  } catch (error) {
      console.error('Error checking files:', error.message);
      res.status(500).json({ status: 'Error', message: error.message });
  }
});

//Endpoint 10: Endpoint to move files to Archieved folder
app.post('/api/archiveFiles', (req, res) => {
  const { initInstanceId } = req.body;

  if (!initInstanceId) {
    return res.status(400).json({ error: 'Missing required parameter: initInstanceId' });
  }

  const instanceFolderPath = path.join(__dirname, 'instanceData', initInstanceId);
  const archivedFolderPath = path.join(instanceFolderPath, 'archived');

  // Check if instanceData/{initInstanceId} exists
  if (!fs.existsSync(instanceFolderPath)) {
    return res.status(400).json({ error: `Instance folder ${initInstanceId} does not exist.` });
  }

  try {
    if (!fs.existsSync(archivedFolderPath)) {
      fs.mkdirSync(archivedFolderPath, { recursive: true });
      console.log(`Created archived folder: ${archivedFolderPath}`);
    }
  } catch (error) {
    console.error('Error creating archived folder:', error.message);
    return res.status(500).json({ error: 'Failed to create archived folder.' });
  }

  try {
    const files = fs.readdirSync(instanceFolderPath);

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const oldFilePath = path.join(instanceFolderPath, file);
        const newFilePath = path.join(archivedFolderPath, file);

        // Move file (overwriting if it exists)
        fs.renameSync(oldFilePath, newFilePath);
        console.log(`Moved ${file} -> ${newFilePath}`);
      }
    });

    res.status(200).json({ message: `All JSON files moved to archived folder for ${initInstanceId}.` });
  } catch (error) {
    console.error('Error moving files:', error.message);
    res.status(500).json({ error: 'Failed to move files to archived folder.' });
  }
});

//Endpoint 11: Get current time:
app.get('/api/currTime', async (req, res) => {
  const currentHourUTC = new Date().getUTCHours();
  res.json(currentHourUTC); 
});
//-------------------------SSE Section to change-------------

app.use(bodyParser.json());
let clients = []; // SSE Clients

// SSE Endpoint:  
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader("Access-Control-Allow-Origin", "https://lehre.bpm.in.tum.de/ports/16068"); // Match frontend
  res.setHeader("Access-Control-Allow-Credentials", "true");
  //remove below
  res.setHeader("Access-Control-Allow-Origin", "*"); // Match frontend



  res.write("data: Connection established\n\n");

  // Store the client response object
  clients.push(res);
  const heartbeat = setInterval(() => {
    res.write(`event: ping\n`);
    res.write(`data: heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(client => client !== res);
  });
});

// Function to send data to SSE clients

const sendToClients = (data) => {
  const instanceData = readJsonFile(instanceFilePath);  

  // Extract instanceId from the CPEE response
  const instanceId = data.instance?.toString();  

  if (!instanceId) {
    console.log("Skipping event: instanceId is missing in the received data.");
    return;
  }

  // Check if instanceId exists in the file
  const exists = instanceData.some(entry => entry.initInstanceId === instanceId);

  if (exists) {
    const jsonData = JSON.stringify(data);
    clients.forEach(client => {
      client.write(`data: ${jsonData}\n\n`);
    });
    console.log(`Sent to clients: ${jsonData}`);
  } else {
    console.log(`Skipping event: instanceId ${instanceId} not found in newData.json`);
  }
};

//-------------------------End SSE Section -------------

//-------------------------TCP Section to change-------------
// Flatten Objects
const flattenObject = (obj, prefix = '', result = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key; // Combine keys with dot notation

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      flattenObject(value, newKey, result);
    } else if (Array.isArray(value)) {
      // Flatten arrays by stringifying them or extracting their contents
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          flattenObject(item, `${newKey}[${index}]`, result);
        } else {
          result[`${newKey}[${index}]`] = item;
        }
      });
    } else {
      // Assign simple values directly
      result[newKey] = value;
    }
  }
  return result;
};

// Parse Headers
const parseHeaders = (rawHeaders) => {
  const headerLines = rawHeaders.split('\r\n');
  const headerObj = {};

  headerLines.forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const headerKey = key.trim().toLowerCase();
      const headerValue = valueParts.join(':').trim();

      // Handle multiple headers with the same name
      if (headerObj[headerKey]) {
        if (Array.isArray(headerObj[headerKey])) {
          headerObj[headerKey].push(headerValue);
        } else {
          headerObj[headerKey] = [headerObj[headerKey], headerValue];
        }
      } else {
        headerObj[headerKey] = headerValue;
      }
    }
  });
  return headerObj;
};

// Multipart body parsing
const parseMultipartBody = (body, boundary) => {
  const parts = [];
  const boundaryDelimiter = `--${boundary}`;
  const endBoundaryDelimiter = `--${boundary}--`;

  let start = 0;
  let end = body.indexOf(boundaryDelimiter, start);

  while (end !== -1) {
    const part = body.slice(start, end).trim();
    if (part) {
      parts.push(parsePart(part));
    }
    start = end + boundaryDelimiter.length;
    end = body.indexOf(boundaryDelimiter, start);
  }

  // Last boundary check
  if (body.endsWith(endBoundaryDelimiter)) {
    const lastPart = body.slice(start, body.length - endBoundaryDelimiter.length).trim();
    if (lastPart) {
      parts.push(parsePart(lastPart));
    }
  }

  return parts;
};

const parsePart = (part) => {
  const [headersRaw, body] = part.split('\r\n\r\n');
  const headers = parseHeaders(headersRaw);
  return { headers, content: body };
};

// TCP Server to handle raw data
const tcpServer = net.createServer((socket) => {
  console.log('Netcat connection established.');

  let rawData = '';

  socket.on('data', (chunk) => {
    console.log('Raw buffer chunk received:', chunk.toString('utf8'));  // Log raw buffer chunk
    rawData += chunk.toString('utf8');

    console.log('Full raw data received:\n', rawData);  // Log entire raw data

    try {
      const parts = rawData.split('\r\n\r\n');  // Split headers and body
      const rawHeaders = parts[0];
      const body = parts.slice(1).join('\r\n\r\n');  // Remainder: body

      const parsedHeaders = parseHeaders(rawHeaders);
      const contentType = parsedHeaders['content-type'];

      if (!contentType || !contentType.includes('multipart/form-data')) {
        console.error('Invalid or missing Content-Type. Expected multipart/form-data');
        return;
      }

      const boundary = contentType.split('boundary=')[1].replace(/"/g, '');
      console.log('Boundary:', boundary);

      // Parse multipart body
      const parsedBody = parseMultipartBody(body, boundary);
      console.log('Parsed Multipart Body:', parsedBody);

      // Check for JSON part
      const jsonPart = parsedBody.find((part) =>
        part.headers['content-type'] === 'application/json' ||
        part.headers['content-disposition']?.includes('name="notification"')
      );

      if (jsonPart) {
        try {
          const jsonData = JSON.parse(jsonPart.content);
          const instanceId = jsonData.instance;
          const eventName = jsonData.name;
          if (jsonData.content && jsonData.content.activity && eventName === "extraction") {
            const activity = jsonData.content.activity;

            console.log('Parsed JSON Data:', jsonData);
            sendToClients(jsonData);
            saveJsonToFile(instanceId, activity, jsonData); // Save JSON to file
          } else {
            console.warn('Skipping TCP event: Missing activity or extraction in JSON data.');
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      } else {
        console.error('No JSON part found in the multipart data.');
      }
    } catch (err) {
      console.error('Error parsing request:', err.message);
    }
  });

  socket.on('error', (err) => {
    console.error('Netcat error:', err);
  });

  socket.on('end', () => { console.log("Netcat connection ended") });

});

//----------------------end section---------------


server.listen(PORT, () => {
  console.log(` HTTP API running on port ${PORT}`);
});
// Share the same socket for TCP
server.on('connection', (socket) => {
  tcpServer.emit('connection', socket);
});

console.log('TCP server and HTTP API running on port 16067');
