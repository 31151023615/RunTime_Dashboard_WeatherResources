import React, { useEffect, useState, useRef } from "react";
import { Box, Grid, Card, CardContent, Typography, Link } from "@mui/material";
import TemperatureVsDemandChart from "./TemperatureVsDemandChart";
import WindGenerationChart from "./WindGenerationChart";
import SolarGenerationChart from "./SolarGenerationChart";
import AllFuelGenerationChart from "./AllFuelGenerationChart";
import TurbineCircularChart from "./TurbineCircularChart";
import { Circle} from "@mui/icons-material"; 

import { useSSEData } from "./SSEProvider"; // ✅ Import the SSE Hook


// 🔹 Utility: Format Forecast Data into an Object
const processForecastData = (forecast) => {
  if (!forecast || !Array.isArray(forecast)) {
    console.warn("⚠️ Forecast data is missing or invalid:", forecast);
    return {};
  }
  const { hourly } = forecast[0];

  return Object.fromEntries(
    hourly.map(({ t, temp, wid, cld }) => [
      t,
      { temp, wid, cld }
    ])
  );
};
// 🔹 Utility: Generate Fixed Time Series for 24 Hours
const generateFixedTimeSeries = () =>
  Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
  }));

const Dashboard = () => {
  const [instances, setInstances] = useState([null, null]);
  const [windChartData, setWindChartData] = useState({});
  const [solarChartData, setSolarChartData] = useState({});
  const [lineBarChartData, setLineBarChartData] = useState({});
  const [allFuelChartData, setAllFuelChartData] = useState({});
  const [instanceDataMap, setInstanceDataMap] = useState({});
  const [turbineChartData, setTurbineChartData] = useState({});

  const forecastRef = useRef({}); // 🔥 Persist forecast data across re-renders

  //✅ Store all instance data, preserving existing fields
  const updateInstanceData = (instanceId, newData) => {
    setInstanceDataMap((prev) => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || {}),
        ...newData,
      },
    }));

    setInstances((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];

      const exists = safePrev.some((instance) => instance?.instanceId === instanceId);

      if (!exists) {
        return [...safePrev, { instanceId, ...newData }];
      }

      return safePrev.map((instance) =>
        instance?.instanceId === instanceId ? { ...instance, ...newData } : instance
      );
    });
  };


  //===== 📊 Process Demand Data and Associate with Forecast Temperature
  const processDemandData = (instanceId, forecastData, currentTemp, hourlyData) => {
    const fixedTimeSeries = generateFixedTimeSeries();

    const demandMap = Object.fromEntries(
      hourlyData
        .filter((entry) => entry.tp === "D")
        .map((entry) => [entry.p, entry.vl])
    );

    // 🔹 Fallback for missing forecast data
    const fallbackTemperatureMap = Object.fromEntries(
      fixedTimeSeries.map(({ time }) => [time, currentTemp ?? 0])
    );

    // Merge Demand & Forecast into Fixed Series
    const mappedLineBarData = {
      [instanceId]: fixedTimeSeries.map((entry) => ({
        time: entry.time,
        demand: demandMap[entry.time] ?? 0,
        temperature: forecastRef.current[instanceId]?.[entry.time]?.temp ?? fallbackTemperatureMap[entry.time],  
      }))
    };

    console.log("📊 Updated Demand Data with Forecast:", mappedLineBarData);
    setLineBarChartData((prev) => ({
      ...prev,
      [instanceId]: mappedLineBarData[instanceId],
    }));

  };

  //===== 📊 Process Wind Generation Data and associate with Forecast Tem
  const processWindGenerationData = (instanceId, forecastData, currentWind, hourlyData) => {
    const fixedTimeSeries = generateFixedTimeSeries();

    const windGenerationMap = Object.fromEntries(
      hourlyData
        .filter((entry) => entry.fu === "Wind")
        .map((entry) => [entry.p, entry.vl])
    );
    // 🔹 Fallback for missing forecast data
    const fallbackWindGenerationMap = Object.fromEntries(
      fixedTimeSeries.map(({ time }) => [time, currentWind ?? 0])
    );

    // Merge Demand & Forecast into Fixed Series
    const mappedWindChartData = {
      [instanceId]: fixedTimeSeries.map((entry) => ({
        time: entry.time,
        windGeneration: windGenerationMap[entry.time] ?? 0,
        windSpeed: forecastRef.current[instanceId]?.[entry.time]?.wid ?? fallbackWindGenerationMap[entry.time], // Extract temp
        // cloudCover: forecastData[entry.time]?.cld ?? null, // Extract cloud cover
      }))
    };

    setWindChartData((prev) => ({
      ...prev,
      [instanceId]: mappedWindChartData[instanceId],
    }));

    console.log("📊 Updated Wind Chart Data with Forecast:", mappedWindChartData);

  };
  //===== 📊 Process Solar Generation Data and associate with Forecast Tem
  const processSolarGenerationData = (instanceId, forecastData, currentSolar, hourlyData) => {
    const fixedTimeSeries = generateFixedTimeSeries();

    const solarGenerationMap = Object.fromEntries(
      hourlyData
        .filter((entry) => entry.fu === "Solar")
        .map((entry) => [entry.p, entry.vl])
    );
    // 🔹 Fallback for missing forecast data
    const fallbackSolarGenerationMap = Object.fromEntries(
      fixedTimeSeries.map(({ time }) => [time, currentSolar ?? 0])
    );

    // Merge Demand & Forecast into Fixed Series
    const mappedSolarChartData = {
      [instanceId]: fixedTimeSeries.map((entry) => ({
        time: entry.time,
        solarGeneration: solarGenerationMap[entry.time] ?? 0,
        cloudCover: forecastRef.current[instanceId]?.[entry.time]?.cld ?? fallbackSolarGenerationMap[entry.time],
      }))
    };

    setSolarChartData((prev) => ({
      ...prev,
      [instanceId]: mappedSolarChartData[instanceId],
    }));

    console.log("📊 Updated Solar Chart Data with Forecast:", mappedSolarChartData);

  };
  //===== 📊 Process All Fuel Generation Data  
  const processAllGenerationData = (instanceId, hourlyData) => {
    const fixedTimeSeries = generateFixedTimeSeries();

    const allFuelGenerationMap = {};

    hourlyData.forEach(({ p: time, vl: valueGeneration, fu: fuelType }) => {
      if (!allFuelGenerationMap[time]) {
        allFuelGenerationMap[time] = [];
      }
      allFuelGenerationMap[time].push({ fuelType, valueGeneration });
    });

    const mappedAllFuelChartData = {
      [instanceId]: fixedTimeSeries.map(({ time }) => ({
        time,
        fuels: allFuelGenerationMap[time] ?? [] // Ensure array format
      }))
    };

    setAllFuelChartData((prev) => ({
      ...prev,
      [instanceId]: mappedAllFuelChartData[instanceId],
    }));

    console.log("📊 Updated all fuel data Chart Data with Forecast:", mappedAllFuelChartData);
  };

  //==== Process to get initial Turbine Data
  const processTurbineChartData = (instanceId, turbineData, currEnergyGenByWind) => {
    if (!turbineData || !Array.isArray(turbineData)) {
      console.warn("No valid turbine data available");
      return;
    }
  
    const mappedTurbineChartData = {
      [instanceId]: {
        currEnergyGenByWind: currEnergyGenByWind ?? 1000,  
        turbines: turbineData.map((turb) => ({
          turId: turb.turId,
          energyGenerated: turb.vl,
          status: turb.stt === 1 ? "Active" : "Inactive",
        })),
      },
    };
  
    setTurbineChartData((prev) => ({
      ...prev,
      [instanceId]: mappedTurbineChartData[instanceId],
    }));
  
    console.log("📊 Updated Turbine Chart Data:", mappedTurbineChartData);
  };

  //==== Process to get Updated Turbine Status
  const updateTurbineStatusFromEvent = (instanceId, eventData) => {
    if (!eventData || !eventData.values) {
      console.warn("⚠️ No valid eventData.values found, skipping update.");
      return;
    }
  
    setTurbineChartData((prev) => {
      console.log("===>>> Before update:", prev);
      console.log(">>>>>> Event Data:", eventData);  
      const prevInstanceData = prev[instanceId] || { currEnergyGenByWind: 1000, turbines: [] };
  
      const updatedTurbines = prevInstanceData.turbines.map((turb) => {
        const turbineKey = `turbine${turb.turId}`;  
         if (turbineKey in eventData.values) {
          return {
            ...turb,
            status: eventData.values[turbineKey] === 1 ? "Active" : "Inactive",
          };
        }
        return turb; 
      });
        return {
        ...prev,
        [instanceId]: {
          ...prevInstanceData,
          turbines: updatedTurbines,
        },
      };
    });
  
    console.log("📊 Updated Turbine Status from Event:", eventData);
  };

  const sseData = useSSEData();
  useEffect(() => {
      if (!sseData) return;  
    try {
      console.log("Dashboard Page: Processing new SSE Data:", sseData);

      const { instance, content, timestamp } = sseData;
      if (!content?.values) return console.warn("Dashboard Page: ⚠️ No `values` in SSE data.");

      const instanceId = instance.toString();
      const now = new Date();
      const todayDate = now.toISOString().split("T")[0];
      const timestampWeather = timestamp;

      let currentTemp = null;
      let currentWind = null;
      let currentSolar = null;


      // 🌤 Handle Weather Data
      if (content.values.weatherResponses?.data) {
        const weather = content.values.weatherResponses.data;
        if (typeof weather.forecast === "string") {
          console.log("🔄 Parsing forecast JSON...");
          weather.forecast = JSON.parse(weather.forecast);
        }
        currentTemp = weather.current?.cur_temperature ?? 0;
        currentWind = weather.current?.cur_windspeed ?? 0;
        currentSolar = weather.current?.cur_cloudCover ?? 0;

        forecastRef.current[instanceId] = weather.forecast || {};

        if (weather.forecast) {
          console.log("🌤 Forecast Data Before Processing:", weather.forecast);
          forecastRef.current[instanceId] = processForecastData(weather.forecast);
          console.log("✅ Processed Forecast Data Stored:", forecastRef.current);
        } else {
          console.warn(`⚠️ No forecast data available for instance ${instanceId}, initializing empty object.`);
          forecastRef.current[instanceId] = {}; 
        }
        //Update the instanceData 
        updateInstanceData(instanceId, {
          temperature: `${currentTemp}°C`,
          weather: weather.current?.condition.text ?? "Unknown",
          windSpeed: `${weather.current?.cur_windspeed ?? 0} km/h`,
          cloudCover: `${weather.current?.cur_cloudCover ?? 0}%`,
          location: weather.location,
          country: weather.country,
          timestamp: timestampWeather,
        });
      }
      // ⚡ Handle Demand Data
      if (content.values.demandResponses?.data?.hourlyData) {
        processDemandData(instanceId, forecastRef.current[instanceId] || {}, currentTemp, content.values.demandResponses.data.hourlyData);
      }
      // ⚡Handle Wind Generation Data
      if (content.values.generationResponses?.data?.hourlyData) {
         processWindGenerationData(instanceId, forecastRef.current[instanceId] || {}, currentWind, content.values.generationResponses.data.hourlyData);

      }
      // ⚡ Handle Solar Generation Data
      if (content.values.generationResponses?.data?.hourlyData) {
        processSolarGenerationData(instanceId, forecastRef.current[instanceId] || {}, currentSolar, content.values.generationResponses.data.hourlyData);
      }
      // ⚡ Handle Solar Generation Data
      if (content.values.generationResponses?.data?.hourlyData) {
        processAllGenerationData(instanceId, content.values.generationResponses.data.hourlyData);
      }
      // ⚡ Handle the update Turbine status
      if (content?.values.generationResponses?.data?.turbines?.turb) {
        processTurbineChartData(instanceId, content.values.generationResponses.data.turbines.turb, content.values.generationResponses.currEnergyGenByWind);
      } 
      if (content?.values && (content.values.turbine1 !== undefined || content.values.turbine2 !== undefined || content.values.turbine3 !== undefined || content.values.turbine4 !== undefined)) {
        console.log("🚀 Updating Turbine Status");
        updateTurbineStatusFromEvent(instanceId, content);
      }

    } catch (error) {
      console.error("Error parsing SSE data:", error);
    }
  }, [sseData]);


  return (
    <>
      {/* 🔍 Debugging Log */}
      {console.log("📌 Parent Props Before Render:", { instances, lineBarChartData, windChartData, allFuelChartData })}

      <Box sx={{ backgroundColor: "#060C1A", minHeight: "100vh", padding: "20px" }}>
        <Typography
          variant="h4"
          sx={{ color: "white", textAlign: "center", marginBottom: "20px" }}
        >
          Weather Vs Energy Dashboard
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "white", textAlign: "center", marginBottom: "20px" }}
        >
          <Link
            href="https://lehre.bpm.in.tum.de/ports/16068/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "#64B5F6", textDecoration: "underline", fontWeight: "bold" }}
          >
            Select other instances
          </Link>
        </Typography>
        {/* 🔹 Row 1: Current Weather Instances */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance) // Remove null/undefined values
            .slice(-2)
            .map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`weather-${instanceData.instanceId || index}`}>
                <CurrentWeatherInstanceCard instanceData={instanceData} index={index} />
              </Grid>
            ))}
        </Grid>

        {/* 🔹 Row 2: Forecast Temperature Vs Electricity Demand */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance)
            .slice(-2)
            .map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`temp-demand-${instanceData.instanceId || index}`}>
                <LineInstanceCard instanceData={instanceData} lineBarChartData={lineBarChartData} index={index} />
              </Grid>
            ))}
        </Grid>
        {/* 🔹 Row 3: Turbine data */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance)
            .slice(-2).map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`turbine-${instanceData?.instanceId || `index-${index}`}`}>
                <TurbineInstanceCard instanceData={instanceData} turbineChartData={turbineChartData} index={index} />
              </Grid>
            ))}
        </Grid>
        {/* 🔹 Row 3: Wind Speed Vs Electricity Generation */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance)
            .slice(-2)
            .map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`wind-${instanceData.instanceId || index}`}>
                <WindInstanceCard instanceData={instanceData} windChartData={windChartData} index={index} />
              </Grid>
            ))}
        </Grid>



        {/* 🔹 Row 4: Cloud Cover Vs Electricity Generation */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance)
            .slice(-2)
            .map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`solar-${instanceData.instanceId || index}`}>
                <SolarInstanceCard instanceData={instanceData} solarChartData={solarChartData} index={index} />
              </Grid>
            ))}
        </Grid>
        {/* 🔹 Row 5: Electricity Generation */}
        <Grid container spacing={3}>
          {(instances ?? [])
            .filter((instance) => instance)
            .slice(-2)
            .map((instanceData, index) => (
              <Grid item xs={12} md={6} key={`solar-${instanceData.instanceId || index}`}>
                <AllFuelInstanceCard instanceData={instanceData} allFuelChartData={allFuelChartData} index={index}

                />
              </Grid>
            ))}
        </Grid>


      </Box>
    </>
  );


};

// 🏡 Extracted current Weather Instance Card Component
const CurrentWeatherInstanceCard = ({ instanceData, instanceDataMap, lineBarChartData, index }) => {
  console.log("🔍 Received Props:", { instanceData, instanceDataMap, lineBarChartData });

  const lineInstanceChartData = instanceData ? lineBarChartData?.[instanceData.instanceId] : null;


  console.log(`🟢 Line Data for Instance ${instanceData?.instanceId}:`, lineInstanceChartData);
  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceData ? `Current Weather of Instance ID: ${instanceData.instanceId}` : `Current Weather of Instance ID: ${index + 1}`}
        </Typography>

        {instanceData ? (
          <>
            <Typography variant="body1"><strong>Timestamp:</strong> {instanceData.timestamp}</Typography>
            <Typography variant="body1"><strong>Location:</strong> {instanceData.location}, {instanceData.country}</Typography>
            <Typography variant="body1"><strong>Weather:</strong> {instanceData.weather}</Typography>
            <Typography variant="body1"><strong>Temperature:</strong> {instanceData.temperature}</Typography>

          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: "center" }}>Waiting for data...</Typography>
        )}
      </CardContent>
    </Card>
  );
};

// 🏡 Extracted Line Instance Card Component
const LineInstanceCard = ({ instanceData, lineBarChartData, index }) => {
  const lineInstanceChartData = instanceData ? lineBarChartData?.[instanceData.instanceId] : null;
  console.log(`🟢 Line Data for Instance ${instanceData?.instanceId}:`, lineInstanceChartData);
  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceData ? `Forecast Temperature Vs Electricity Demand: ${instanceData.instanceId}` : `Forecast Temperature Vs Electricity Demand: ${index + 1}`}
        </Typography>

        {instanceData ? (
          <>
            {/* 🔥 Temperature vs Demand Chart Here */}
            {lineInstanceChartData ? (
              <TemperatureVsDemandChart data={lineInstanceChartData} />
            ) : (
              <Typography variant="body2" sx={{ textAlign: "center", marginTop: "10px" }}>
                No chart data available.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: "center" }}>Waiting for data...</Typography>
        )}
      </CardContent>
    </Card>
  );
};


// 🏡 Extracted Wind Instance Card Component
const WindInstanceCard = ({ instanceData, windChartData, index }) => {
  const windInstanceChartData = instanceData ? windChartData[instanceData.instanceId] : null;

  console.log(`🟢 Wind Data for Instance ${instanceData?.instanceId}:`, windInstanceChartData);

  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceData ? ` Wind Speed Vs Electricity generated by Wind: ${instanceData.instanceId}` : `Wind Speed Vs Electricity generated by Wind: ${index + 1}`}
        </Typography>

        {instanceData ? (
          <>
            {/* 🔥 Wind vs Electricity Generation Chart Here */}
            {windInstanceChartData ? (
              <WindGenerationChart data={windInstanceChartData} />
            ) : (
              <Typography variant="body2" sx={{ textAlign: "center", marginTop: "10px" }}>
                No chart data available.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: "center" }}>Waiting for data...</Typography>
        )}
      </CardContent>
    </Card>
  );
};

// 🏡 Extracted Solar Instance Card Component
const SolarInstanceCard = ({ instanceData, solarChartData, index }) => {

  const solarInstanceChartData = instanceData ? solarChartData[instanceData.instanceId] : null;

  console.log(`🟢 Solar Data for Instance ${instanceData?.instanceId}:`, solarInstanceChartData);

  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceData ? ` Cloud Cover Vs Electricity generated by Solar: ${instanceData.instanceId}` : `Cloud Cover Vs Electricity generated by Solar: ${index + 1}`}
        </Typography>

        {instanceData ? (
          <>
            {/* 🔥 Wind vs Electricity Generation Chart Here */}
            {solarInstanceChartData ? (
              <SolarGenerationChart data={solarInstanceChartData} />
            ) : (
              <Typography variant="body2" sx={{ textAlign: "center", marginTop: "10px" }}>
                No chart data available.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: "center" }}>Waiting for data...</Typography>
        )}
      </CardContent>
    </Card>
  );
};

// 🏡 Extracted All Fuel Instance Card Component
const AllFuelInstanceCard = ({ instanceData, allFuelChartData, index }) => {

  const allFuelInstanceChartData = instanceData ? allFuelChartData?.[instanceData.instanceId] ?? [] : [];

  // const allFuelInstanceChartData = instanceData?.instanceId ? allFuelChartData?.[instanceData.instanceId] ?? []
  //   : [];
  console.log(`🟢 All Fuel Type Data for Instance ${instanceData?.instanceId}:`, allFuelInstanceChartData);

  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceData ? ` Energy generation by resources: ${instanceData.instanceId}` : `  Energy generation by resources: ${index + 1}`}
        </Typography>

        {instanceData ? (
          <>
            {/* 🔥   Electricity Generation Chart Here */}
            {allFuelInstanceChartData.length > 0 ? (
              <AllFuelGenerationChart data={allFuelInstanceChartData} />
            ) : (
              <Typography variant="body2" sx={{ textAlign: "center", marginTop: "10px" }}>
                No chart data available.
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: "center" }}>Waiting for data...</Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Extract Turbine data Instance Card component
const TurbineInstanceCard = ({ instanceData, turbineChartData, index }) => {
  const instanceId = instanceData?.instanceId;
  // Extract turbine data for the instance
  const instanceTurbineData = turbineChartData?.[instanceId] ?? {};
  const instanceTurbines = instanceTurbineData?.turbines ?? [];
  const currEnergyGenByWind = instanceTurbineData?.currEnergyGenByWind ?? 0;
  const maxEnergy = currEnergyGenByWind ?? 1000;

  return (
    <Card
      sx={{
        background: "linear-gradient(to bottom, #162850, #121A2D)",
        color: "white",
        borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
        paddingBottom: "20px",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {instanceId
            ? `Turbine Data - Instance: ${instanceId}`
            : `Turbine Data - Instance: ${index + 1}`}
        </Typography>

        {/* Display total wind energy generation */}
        <Typography variant="body1" sx={{ marginBottom: "10px", textAlign: "center" }}>
          <strong>Total Energy from Wind:</strong> {currEnergyGenByWind} kWh
        </Typography>

        {instanceTurbines.length > 0 ? (
          <Grid container spacing={2}>
            {instanceTurbines.map((turb) => {
              const isActive = turb.status === "Active";
              const statusColor = isActive ? "green" : "red";

              return (
                <Grid item xs={6} sm={3} key={`turb-${turb.turId}`}>
                  <Card sx={{ backgroundColor: "#1A2B4C", padding: "10px", color: "white" }}>
                    <Typography variant="body1">
                      <strong>ID:</strong> {turb.turId}
                    </Typography>
                    <TurbineCircularChart
                      energyGenerated={turb.energyGenerated}
                      maxEnergy={maxEnergy}
                      isActive={isActive}
                    />
                    <Typography variant="body2">
                      <strong>Energy:</strong> {turb.energyGenerated} kWh
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ display: "flex", alignItems: "center", color: statusColor }}
                    >
                      <Circle sx={{ fontSize: 10, color: statusColor, marginRight: 1 }} />
                      <strong>Status:</strong> {turb.status}
                    </Typography>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ textAlign: "center", marginTop: "10px" }}>
            No turbine data available.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};


export default Dashboard;
