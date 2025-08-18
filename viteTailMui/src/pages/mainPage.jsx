import './mainPage.css'
import Button from '@mui/material/Button'
import { Computer } from '@mui/icons-material'
import { Box } from '@mui/material'
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const colorPalette = {
  purple: '#38014f',
  blue: '#130059',
}
const colorPaletteButton = {
  '#38014f': '#9c27b0',
  '#130059': '#2196f3',
}
const counterData = [
  { id: 1, name: "Bekleyen İşlemler", value: 10, color: colorPalette.blue },
  { id: 2, name: "Tamamlanan İşlemler", value: 5, color: colorPalette.purple },
  { id: 3, name: "Başarısız İşlemler", value: 8, color: colorPalette.blue },
  { id: 4, name: "Diğer İşlemler", value: 12, color: colorPalette.purple },
];
const totalActions = counterData.reduce((acc, counter) => acc + counter.value, 0);

const pages = [];
const userSignedin = true; // veya false, duruma göre
const settings = userSignedin ? ['Profile', 'Account', 'Dashboard', 'Logout'] : ['Login'];



async function getDataGetReq() {
  try {
    const response = await fetch('/api/counterData'); // proxy kullanıyorsanız
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

const toolsData = [
  { id: 'katana', name: "Katana Crawler", description: "Web crawling tool to discover URLs and endpoints with advanced algorithms.", color: colorPalette.blue },
  { id: 'nmap', name: "Nmap Scanner", description: "Network mapping and port scanning tool for security assessment.", color: colorPalette.purple },
  { id: 'whois', name: "Whois Lookup", description: "Domain and IP address information lookup service.", color: colorPalette.blue },
  { id: 'command', name: "Command Runner", description: "Execute custom shell commands and scripts remotely.", color: colorPalette.purple },
];

function ToolsCard({ tool, icon, onNavigate }) {
  return (
    <Box
      p={5}
      borderRadius={5}
      boxShadow={3}
      maxWidth={360}
      height={360}
      display="flex"
      flexDirection="column"
      alignItems="center"
      textAlign="center"
      sx={{
        background: 'rgba(0,0,0,0.5)',
        transition: 'background 0.3s, box-shadow 0.3s, transform 0.3s',
        '&:hover': {
          boxShadow: 12,
          background: tool.color,
          transform: 'scale(1.07)',
          zIndex: 10,
        },
      }}
    >
      {icon}
      <h2 className="text-2xl font-bold">{tool.name}</h2>
      <p className="text-gray-300 my-4">{tool.description}</p>
      <Button
        variant="contained"
        sx={{ backgroundColor: colorPaletteButton[tool.color], color: '#fff' }}
        className="my-4"
        onClick={() => onNavigate(tool)}
      >
        Use Tool
      </Button>
    </Box>
  )
}



function Counter({ name, value, color }) {
  return (
    <Box
      p={5}
      borderRadius={5}
      boxShadow={3}
      width={240}
      height={180}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      sx={{
        background: 'rgba(0,0,0,0.5)',
        transition: 'background 0.3s, box-shadow 0.3s, transform 0.3s',
        '&:hover': {
          boxShadow: 8,
          background: color,
          transform: 'scale(1.05)',
          zIndex: 10,
        },
      }}
    >
      <h2 className="text-2xl font-bold">{name}</h2>
      <p className="text-3xl">{value}</p>
    </Box>
  );
}




function App() {
  const navigate = useNavigate();
  const [apiData, setApiData] = useState(counterData); // Default data
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getDataGetReq();
      if (data) {
        setApiData(data);
        for (const id in data) {
          const counterIndex = counterData.findIndex(counter => counter.id === data[id].id);
          if (counterIndex !== -1) {
            counterData[counterIndex].value = data[id].value;
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []); // Sadece ilk yüklemede çalış

  const handleNavigateToTool = (tool) => {
    navigate(`/tools/${tool.id}`, { state: { tool } });
  };

  return (
    <>
      <div className='flex flex-col items-center min-h-screen w-screen p-4 bg-gradient-to-r from-[#38014f]  to-[#130059] overflow-x-hidden'>
       
        <div className='max-w-9xl h-screen w-full p-8  rounded-lg flex flex-col items-center justify-center text-center mb-8'>
          <h1 className='text-6xl font-bold mb-8'>Web Güvenliği için Crawler, Nmap, Whois ve Diğer Araçlar</h1>
          {loading ? (
            <div className="text-white">Loading...</div>
          ) : (
            <>
              <div className='text-center text-gray-300 mb-8'>
                <h2 className='text-2xl font-bold'>
                  Toplam İşlem Sayısı: {counterData.reduce((acc, counter) => acc + counter.value, 0)}
                </h2>
              </div>
            </>
          )}
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#2196f3',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              px: 4,
              py: 2,
              borderRadius: 3,
              boxShadow: 3,
              mb: 6,
              '&:hover': {
                backgroundColor: '#1769aa',
                transform: 'scale(1.05)',
              },
            }}
            onClick={() => {
              const toolsSection = document.getElementById('tools-section');
              if (toolsSection) {
                toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start'});
              }
            }}
          >
            Araçlara Git
          </Button>
          <div className="h-32"></div>
        </div>
        <h2 className='text-4xl font-bold mb-8'>Sayaçlar</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8'>
          {counterData.map(counter => (
            <Counter key={counter.id} name={counter.name} value={counter.value} color={counter.color} />
          ))}
        </div>
        <h2 className='text-4xl font-bold mb-8'>Araçlar</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8' id='tools-section'>
          {toolsData.map(tool => (
            <ToolsCard
              key={tool.id}
              tool={tool}
              icon={<Computer className='my-4' style={{ fontSize: '3rem' }} />}
              onNavigate={handleNavigateToTool}
            />
          ))}
        </div>
        <div className="h-28"></div>
      </div>
    </>
  )
}

export default App
