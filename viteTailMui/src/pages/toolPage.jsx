import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, TextField, Card, CardContent, Typography, Paper, LinearProgress, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ArrowBack, PlayArrow, Stop, Download, Refresh, ExpandMore, Security, Language, Terminal } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';

const colorPalette = {
  purple: '#38014f',
  blue: '#130059',
}

const colorPaletteButton = {
  '#38014f': '#9c27b0',
  '#130059': '#2196f3',
}

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

const getAuthHeaders = async () => {
  const user = auth.currentUser;

  if (!user) {
    // Login olmayan kullanıcılar için session ID kullan
    const sessionId = getSessionId();
    return {
      'Content-Type': 'application/json',
      'Session-ID': sessionId,
      'User-Type': 'guest'
    };
  }

  const token = await user.getIdToken();

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-ID': user.uid,
    'User-Type': 'authenticated'
  };
};

// Katana Crawler Tool Component
function KatanaTool({ tool }) {
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [logs, setLogs] = useState([]);
  const [taskId, setTaskId] = useState(null);

  const handleStartCrawling = async () => {
    if (!url) return;

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setLogs([]);
    const headers = await getAuthHeaders();

    try {
      // API call to start Katana crawling
      const response = await fetch('/api/run-katana', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      setTaskId(data.task_id);
      setLogs(prev => [...prev, `Started Katana crawling for: ${url}`]);

      // Poll for results
      pollTaskStatus(data.task_id);

    } catch (error) {
      setIsRunning(false);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const pollTaskStatus = async (id) => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/katana-result/${id}`);
        const data = await response.json();

        setProgress((attempts / maxAttempts) * 100);

        if (data.status === 'SUCCESS') {
          setIsRunning(false);
          setProgress(100);

          if (data.result && data.result.crawl_results) {
            setResults(data.result.crawl_results);
            setLogs(prev => [...prev, `Crawling completed! Found ${data.result.total_found} URLs`]);
          }
        } else if (data.status === 'FAILURE') {
          setIsRunning(false);
          setLogs(prev => [...prev, `Crawling failed: ${data.result?.error || 'Unknown error'}`]);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setIsRunning(false);
          setLogs(prev => [...prev, 'Crawling timeout']);
        }
      } catch (error) {
        setIsRunning(false);
        setLogs(prev => [...prev, `Polling error: ${error.message}`]);
      }
    };

    poll();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'katana-crawl-results.json';
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            Katana Web Crawler Configuration
          </Typography>

          <div className="space-y-4">
            <TextField
              fullWidth
              label="Target URL"
              variant="outlined"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isRunning}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '& input': { color: 'white' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
              }}
            />

            <div className="flex gap-3">
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleStartCrawling}
                disabled={isRunning || !url}
                sx={{ backgroundColor: colorPaletteButton[tool.color] }}
              >
                Start Crawling
              </Button>

              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
                disabled={results.length === 0}
                sx={{ borderColor: 'white', color: 'white' }}
              >
                Export Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress and Results sections remain similar to previous implementation */}
      {isRunning && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Crawling Progress
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
            <Typography variant="body2" sx={{ color: 'white', mt: 1 }}>
              {Math.round(progress)}% Complete
            </Typography>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              Crawl Results ({results.length} URLs found)
            </Typography>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <Paper key={index} sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace' }}>
                    {typeof result === 'string' ? result : result.url || JSON.stringify(result)}
                  </Typography>
                </Paper>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Logs</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 200, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <Typography key={index} variant="body2" sx={{ color: '#00ff00', mb: 0.5, fontFamily: 'monospace' }}>
                  [{new Date().toLocaleTimeString()}] {log}
                </Typography>
              ))}
            </Paper>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Nmap Scanner Tool Component
function NmapTool({ tool }) {
  const [target, setTarget] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState('');
  const [logs, setLogs] = useState([]);

  const handleStartScan = async () => {
    if (!target) return;

    setIsRunning(true);
    setResults('');
    setLogs([]);
    const headers = await getAuthHeaders();

    try {
      const response = await fetch('/api/nmap-scan', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ target })
      });

      const data = await response.json();
      setLogs(prev => [...prev, `Started Nmap scan for: ${target}`]);

      // Poll for results
      pollTaskStatus(data.task_id);

    } catch (error) {
      setIsRunning(false);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const pollTaskStatus = async (id) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/nmap-result/${id}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
          setIsRunning(false);
          setResults(data.result?.scan_result || 'No results');
          setLogs(prev => [...prev, 'Nmap scan completed successfully']);
        } else if (data.status === 'FAILURE') {
          setIsRunning(false);
          setLogs(prev => [...prev, `Scan failed: ${data.result?.error || 'Unknown error'}`]);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          setIsRunning(false);
          setLogs(prev => [...prev, 'Scan timeout']);
        }
      } catch (error) {
        setIsRunning(false);
        setLogs(prev => [...prev, `Polling error: ${error.message}`]);
      }
    };

    poll();
  };

  return (
    <div className="space-y-6">
      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
            Nmap Network Scanner Configuration
          </Typography>

          <div className="space-y-4">
            <TextField
              fullWidth
              label="Target (IP or Domain)"
              variant="outlined"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="192.168.1.1 or example.com"
              disabled={isRunning}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '& input': { color: 'white' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
              }}
            />

            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleStartScan}
              disabled={isRunning || !target}
              sx={{ backgroundColor: colorPaletteButton[tool.color] }}
            >
              {isRunning ? 'Scanning...' : 'Start Scan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Scan Results</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {results}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Logs</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 200, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <Typography key={index} variant="body2" sx={{ color: '#00ff00', mb: 0.5, fontFamily: 'monospace' }}>
                  [{new Date().toLocaleTimeString()}] {log}
                </Typography>
              ))}
            </Paper>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Whois Lookup Tool Component
function WhoisTool({ tool }) {
  const [domain, setDomain] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState('');
  const [logs, setLogs] = useState([]);

  const handleLookup = async () => {
    if (!domain) return;

    setIsRunning(true);
    setResults('');
    setLogs([]);
    const headers = await getAuthHeaders();

    try {
      const response = await fetch('/api/whois-lookup', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ ip_address_or_domain: domain })
      });

      const data = await response.json();
      setLogs(prev => [...prev, `Started Whois lookup for: ${domain}`]);

      pollTaskStatus(data.task_id);

    } catch (error) {
      setIsRunning(false);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const pollTaskStatus = async (id) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/whois-result/${id}`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
          setIsRunning(false);
          setResults(data.result?.whois_result || 'No results');
          setLogs(prev => [...prev, 'Whois lookup completed successfully']);
        } else if (data.status === 'FAILURE') {
          setIsRunning(false);
          setLogs(prev => [...prev, `Lookup failed: ${data.result?.error || 'Unknown error'}`]);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 3000);
        } else {
          setIsRunning(false);
          setLogs(prev => [...prev, 'Lookup timeout']);
        }
      } catch (error) {
        setIsRunning(false);
        setLogs(prev => [...prev, `Polling error: ${error.message}`]);
      }
    };

    poll();
  };

  return (
    <div className="space-y-6">
      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
            Whois Information Lookup
          </Typography>

          <div className="space-y-4">
            <TextField
              fullWidth
              label="Domain or IP Address"
              variant="outlined"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com or 8.8.8.8"
              disabled={isRunning}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '& input': { color: 'white' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
              }}
            />

            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleLookup}
              disabled={isRunning || !domain}
              sx={{ backgroundColor: colorPaletteButton[tool.color] }}
            >
              {isRunning ? 'Looking up...' : 'Lookup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Whois Information</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="body2" sx={{ color: 'white', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {results}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Logs</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 200, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <Typography key={index} variant="body2" sx={{ color: '#00ff00', mb: 0.5, fontFamily: 'monospace' }}>
                  [{new Date().toLocaleTimeString()}] {log}
                </Typography>
              ))}
            </Paper>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Command Runner Tool Component
function CommandTool({ tool }) {
  const [command, setCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  const handleRunCommand = async () => {
    if (!command) return;

    setIsRunning(true);
    setResults(null);
    setLogs([]);
    const headers = await getAuthHeaders();

    try {
      const response = await fetch('/api/tasks/command', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ command })
      });

      const data = await response.json();
      setLogs(prev => [...prev, `Started command execution: ${command}`]);

      pollTaskStatus(data.task_id);

    } catch (error) {
      setIsRunning(false);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const pollTaskStatus = async (id) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/tasks/${id}/status`);
        const data = await response.json();

        if (data.status === 'SUCCESS') {
          setIsRunning(false);
          setResults(data.result);
          setLogs(prev => [...prev, 'Command executed successfully']);
        } else if (data.status === 'FAILURE') {
          setIsRunning(false);
          setResults(data.result);
          setLogs(prev => [...prev, `Command failed: ${data.result?.error || 'Unknown error'}`]);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setIsRunning(false);
          setLogs(prev => [...prev, 'Command timeout']);
        }
      } catch (error) {
        setIsRunning(false);
        setLogs(prev => [...prev, `Polling error: ${error.message}`]);
      }
    };

    poll();
  };

  return (
    <div className="space-y-6">
      <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            <Terminal sx={{ mr: 1, verticalAlign: 'middle' }} />
            Command Runner
          </Typography>

          <div className="space-y-4">
            <TextField
              fullWidth
              label="Shell Command"
              variant="outlined"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="ls -la"
              disabled={isRunning}
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '& textarea': { color: 'white', fontFamily: 'monospace' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
              }}
            />

            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleRunCommand}
              disabled={isRunning || !command}
              sx={{ backgroundColor: colorPaletteButton[tool.color] }}
            >
              {isRunning ? 'Executing...' : 'Execute Command'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Command Results</Typography>

            {results.stdout && (
              <Accordion sx={{ backgroundColor: 'rgba(255,255,255,0.05)', mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                  <Typography sx={{ color: 'white' }}>Standard Output</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Typography variant="body2" sx={{ color: '#00ff00', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {results.stdout}
                    </Typography>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}

            {results.stderr && (
              <Accordion sx={{ backgroundColor: 'rgba(255,255,255,0.05)', mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                  <Typography sx={{ color: 'white' }}>Standard Error</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <Typography variant="body2" sx={{ color: '#ff6b6b', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {results.stderr}
                    </Typography>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}

            <Typography variant="body2" sx={{ color: 'white', mt: 2 }}>
              Return Code: <Chip label={results.return_code} color={results.return_code === 0 ? 'success' : 'error'} size="small" />
            </Typography>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Logs</Typography>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.3)', maxHeight: 200, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <Typography key={index} variant="body2" sx={{ color: '#00ff00', mb: 0.5, fontFamily: 'monospace' }}>
                  [{new Date().toLocaleTimeString()}] {log}
                </Typography>
              ))}
            </Paper>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DefaultTool({ tool }) {
  return (
    <Card sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
          {tool.name}
        </Typography>
        <Typography variant="body1" sx={{ color: '#ccc', mb: 4 }}>
          {tool.description}
        </Typography>
        <Typography variant="body2" sx={{ color: '#999' }}>
          Tool interface coming soon...
        </Typography>
      </CardContent>
    </Card>
  );
}

function ToolPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toolId } = useParams();
  const [tool, setTool] = useState(null);

  const renderToolInterface = () => {
    switch (tool.id) {
      case 'katana':
        return <KatanaTool tool={tool} />;
      case 'nmap':
        return <NmapTool tool={tool} />;
      case 'whois':
        return <WhoisTool tool={tool} />;
      case 'command':
        return <CommandTool tool={tool} />;
      default:
        return <DefaultTool tool={tool} />;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (location.state?.tool) {
      setTool(location.state.tool);
    } else {
      const toolsData = {
        'katana': { id: 'katana', name: "Katana Crawler", description: "Web crawling tool", color: colorPalette.blue },
        'nmap': { id: 'nmap', name: "Nmap Scanner", description: "Network scanner", color: colorPalette.purple },
        'whois': { id: 'whois', name: "Whois Lookup", description: "Domain information", color: colorPalette.blue },
        'command': { id: 'command', name: "Command Runner", description: "Execute commands", color: colorPalette.purple },
      };
      setTool(toolsData[toolId]);
    }
  }, [location.state, toolId]);

  const handleBack = () => {
    navigate('/');
  };

  if (!tool) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gradient-to-r from-[#38014f] to-[#130059]'>
        <Typography variant="h4" sx={{ color: 'white' }}>Tool not found</Typography>
      </div>
    );
  }

  return (
    <div className='min-h-screen w-screen p-4 bg-gradient-to-r from-[#38014f] to-[#130059]'>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ color: 'white', mr: 2, minWidth: 0, px: 1 }}
        >
          {/* Hide text on small screens for better centering */}
          <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Back to Dashboard</Box>
        </Button>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h3" component="h1" sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
            {tool.name}
          </Typography>
          <Typography variant="h6" sx={{ color: '#ccc', mt: 1, textAlign: 'center' }}>
            {tool.description}
          </Typography>
        </Box>
        {/* Empty box to balance the header for perfect centering */}
        <Box sx={{ width: 200, ml: 2, display: { xs: 'none', sm: 'block' } }} />
      </Box>

      {/* Tool Interface */}
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {renderToolInterface()}
      </Box>
    </div>
  );
}

export default ToolPage;
