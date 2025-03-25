import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Typography, Button, MenuItem, Select, Container, Box } from "@mui/material";

const API_BASE_URL = "https://lehre.bpm.in.tum.de/ports/16067";

const SelectInstance = () => {
  const navigate = useNavigate();
  const [runningInstances, setRunningInstances] = useState([]);
  const [otherInstances, setOtherInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState("");

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/instances`);
        if (!response.ok) throw new Error("Failed to fetch instances");

        const data = await response.json();

        const running = data.runningInstanceIds?.map(inst => inst.initInstanceId) || [];
        const other = data.otherInstanceIds?.map(inst => inst.initInstanceId) || [];

        setRunningInstances(running);
        setOtherInstances([...other, ...running]); 

        if (running.length > 0) {
          setSelectedInstance(running[0]);
        }
      } catch (error) {
        console.error("Error fetching instances:", error);
      }
    };

    fetchInstances();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ textAlign: "center", fontWeight: "bold", mt: 4 }}>
        Select Instance
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 3 }}>

        <Card sx={{ p: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              All Instances
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Please select an instance ID:
            </Typography>
            <Select
              fullWidth
              sx={{ mb: 2 }}
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
            >
              <MenuItem value="">Select an instance</MenuItem>
              {otherInstances.map((id) => (
                <MenuItem key={id} value={id}>
                  {id}
                </MenuItem>
              ))}
            </Select>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2, py: 1 }}
              disabled={!selectedInstance}
              onClick={() => {
                console.log("Navigating with instanceId:", selectedInstance); // Debugging
                if (selectedInstance) {
                    navigate(`/instance/${selectedInstance}`);
                } else {
                    console.error("selectedInstance is undefined!");
                }
            }}            >
              View Details
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default SelectInstance;
