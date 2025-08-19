import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  Grid,
  Paper,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import LanguageIcon from '@mui/icons-material/Language';
import TerminalIcon from '@mui/icons-material/Terminal';
import WebIcon from '@mui/icons-material/Web';
import { auth } from '../firebase/config';



const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + (Date.now() + (3 * 60 * 60 * 1000));
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('guest_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('guest_session_id', sessionId);
  }
  return sessionId;
};

const getuseridlocal = async () => {
  const user = auth.currentUser;

  if (!user) {
    // Login olmayan kullanıcılar için session ID kullan
    const sessionId = getSessionId();
    return sessionId;
  }

  const token = await user.getIdToken();

  return user.uid;


};



const History = ({ userID }) => { // Accept userID as prop from navbar
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use userID from props or fallback to mock ID
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserIdAndHistory = async () => {
      const resolvedUserId = await getuseridlocal();
      setUserId(resolvedUserId);
      fetchHistoryData(resolvedUserId);
    };
    fetchUserIdAndHistory();
  }, []);

  const fetchHistoryData = async (userId) => {
    try {
      setLoading(true);
      
      // Call actual API endpoint
      const response = await fetch(`/api/history/${userId}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle 401 specifically - no tasks found for user
          setHistoryData({ requests: [] });
          setLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiData = await response.json();
      
      // Transform API data to match component structure
      const transformedData = {
        requests: apiData.map((item) => {
          const baseRequest = {
            id: item.id,
            timestamp: (() => {
              const date = new Date(item.created_at);
              date.setHours(date.getHours() - 3);
              return date.toLocaleString();
            })(),
            status: item.status === 'SUCCESS' ? 'Completed' : 'Failed',
            duration: calculateDuration(item.created_at, item.completed_at),
          };


          // Handle different task types
          switch (item.task_type) {
            case 'whois_lookup':
              return {
                ...baseRequest,
                type: 'Whois Lookup',
                target: item.result?.ip_address_or_domain || 'Unknown',
                icon: <LanguageIcon />,
                details: {
                  domain: item.result?.ip_address_or_domain,
                  lookupType: 'Domain Information',
                  server: 'WHOIS Server'
                },
                whoisResult: item.result?.whois_result || 'No data available'
              };

            case 'run_katana':
              return {
                ...baseRequest,
                type: 'Katana Crawling',
                target: item.result?.url || 'Unknown',
                icon: <WebIcon />,
                details: {
                  url: item.result?.url,
                  depth: 'Multiple levels',
                  filters: 'All content types',
                  timeout: 'Default',
                  userAgent: 'Katana/1.0',
                  resultsFound: item.result?.total_found || 0
                },
                results: item.result?.found_url?.slice(0, 50) || [] // Limit to first 50 URLs
              };

            case 'run_nmap':
              return {
                ...baseRequest,
                type: 'Nmap Scan',
                target: item.result?.target || 'Unknown',
                icon: <SecurityIcon />,
                details: {
                  target: item.result?.target,
                  scanType: 'TCP SYN Scan',
                  ports: '1-65535',
                  timing: 'Normal',
                  options: '-sV'
                },
                scanResult: item.result?.scan_result || 'No scan results available'
              };

            case 'run_command':
              return {
                ...baseRequest,
                type: 'Command Execution',
                target: item.result?.command || 'Unknown command',
                icon: <TerminalIcon />,
                details: {
                  command: item.result?.command || 'Unknown',
                  shell: '/bin/bash',
                  workingDir: '/app'
                },
                commandResult: {
                  stdout: item.result?.stdout || '',
                  stderr: item.result?.stderr || '',
                  returnCode: item.result?.return_code || 0
                }
              };

            default:
              return {
                ...baseRequest,
                type: 'Unknown Task',
                target: 'N/A',
                icon: <HistoryIcon />,
                details: {
                  taskType: item.task_type,
                  description: 'Unknown task type'
                }
              };
          }
        })
      };

      setHistoryData(transformedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(`Failed to fetch history data: ${err.message}`);
      setLoading(false);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'Unknown';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'running':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Katana Crawling':
        return <WebIcon color="primary" />;
      case 'Nmap Scan':
        return <SecurityIcon color="primary" />;
      case 'Whois Lookup':
        return <LanguageIcon color="primary" />;
      case 'Command Execution':
        return <TerminalIcon color="primary" />;
      default:
        return <HistoryIcon color="primary" />;
    }
  };

  if (loading) {
    return (
      <Box className="w-screen h-screen flex justify-center items-center bg-gradient-to-r from-[#38014f] to-[#130059]">
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="w-screen h-screen p-8 bg-gradient-to-r from-[#38014f] to-[#130059]">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box className="w-screen min-h-screen p-6 bg-gradient-to-r from-[#38014f] to-[#130059]">
      <Box className="mb-6">
        <Typography variant="h4" component="h1" className="flex items-center gap-2 mb-2" sx={{ color: 'white' }}>
          <HistoryIcon fontSize="large" />
          Request History
        </Typography>

      </Box>

      <Box className="w-full">
        <Card className="w-full" sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" className="mb-3" sx={{ color: 'white' }}>
              Recent Requests ({historyData?.requests?.length || 0})
            </Typography>
            
            {historyData?.requests?.length === 0 ? (
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', py: 4 }}>
                No history data found for this user.
              </Typography>
            ) : (
              <div className="space-y-2">
                {historyData?.requests?.map((request) => (
                  <Accordion key={request.id} sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                      <Box className="flex justify-between items-center w-full mr-4">
                        <Box className="flex items-center gap-3">
                          {React.cloneElement(getTypeIcon(request.type), { sx: { color: 'white' } })}
                          <Box>
                            <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                              {request.type} - {request.target}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {request.timestamp} • Duration: {request.duration}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={request.status} 
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box className="space-y-4">
                        <Typography variant="h6" className="mb-3" sx={{ color: 'white' }}>
                          Request Details
                        </Typography>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {/* Katana Details */}
                          {request.type === 'Katana Crawling' && (
                            <>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Target URL
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.url}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Crawl Depth
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.depth}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Content Filters
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.filters}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Results Found
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.resultsFound} URLs
                                </Typography>
                              </Paper>
                            </>
                          )}

                          {/* Nmap Details */}
                          {request.type === 'Nmap Scan' && (
                            <>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Target
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.target}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Scan Type
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.scanType}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Port Range
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.ports}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Options
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.options}
                                </Typography>
                              </Paper>
                            </>
                          )}

                          {/* Whois Details */}
                          {request.type === 'Whois Lookup' && (
                            <>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Domain
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.domain}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Lookup Type
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.lookupType}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Server
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.server}
                                </Typography>
                              </Paper>
                            </>
                          )}

                          {/* Command Details */}
                          {request.type === 'Command Execution' && (
                            <>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Command
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.command}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Shell
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.shell}
                                </Typography>
                              </Paper>
                              <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Typography variant="subtitle2" sx={{ color: '#4fc3f7', mb: 1 }}>
                                  Working Directory
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                                  {request.details.workingDir}
                                </Typography>
                              </Paper>
                            </>
                          )}
                        </div>

                        {/* Results Section */}
                        {request.status === 'Completed' && (
                          <Accordion sx={{ backgroundColor: 'rgba(255,255,255,0.02)', mt: 3 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                              <Typography variant="h6" sx={{ color: 'white' }}>Results</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              {/* Katana Results */}
                              {request.results && (
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {request.results.map((result, index) => (
                                    <Paper key={index} className="p-2" sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                      <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {result}
                                      </Typography>
                                    </Paper>
                                  ))}
                                </div>
                              )}
                        
                              {/* Nmap Results */}
                              {request.scanResult && (
                                <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                  <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                    {request.scanResult}
                                  </Typography>
                                </Paper>
                              )}
                        
                              {/* Whois Results */}
                              {request.whoisResult && (
                                <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                  <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                    {request.whoisResult}
                                  </Typography>
                                </Paper>
                              )}
                        
                              {/* Command Results */}
                              {request.commandResult && (
                                <div className="space-y-2">
                                  {request.commandResult.stdout && (
                                    <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                      <Typography variant="subtitle2" sx={{ color: '#00ff00', mb: 1 }}>
                                        Standard Output
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                        {request.commandResult.stdout}
                                      </Typography>
                                    </Paper>
                                  )}
                                  {request.commandResult.stderr && (
                                    <Paper className="p-3" sx={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                      <Typography variant="subtitle2" sx={{ color: '#ff6b6b', mb: 1 }}>
                                        Standard Error
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                        {request.commandResult.stderr}
                                      </Typography>
                                    </Paper>
                                  )}
                                  <Typography variant="body2" className="mt-2" sx={{ color: 'white' }}>
                                    Return Code: <Chip 
                                      label={request.commandResult.returnCode} 
                                      color={request.commandResult.returnCode === 0 ? 'success' : 'error'} 
                                      size="small" 
                                    />
                                  </Typography>
                                </div>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default History;
