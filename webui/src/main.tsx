import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { exec, toast } from 'kernelsu';

const App = () => {
  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const { errno, stdout } = await exec("cat /data/adb/agh/bin/AdGuardHome.yaml");
        if (errno !== 0) {
          console.error(`Exec failed with errno ${errno}`);
          toast('无法读取 AdGuardHome 配置，已重定向到默认端口 3000');
        }

        // 使用正则提取端口
        const match = stdout.match(/address:\s*(?:[\d.]+|\[[:\da-f]+])?:(\d+)/i);

        if (match && match[1]) {
          const port = match[1];
          window.location.href = `http://127.0.0.1:${port}`;
        } else {
          console.error("Could not find port in configuration");
            toast('无法找到 AdGuardHome 配置中的端口，已重定向到默认端口 3000');
            window.location.href = `http://127.0.0.1:3000`;
        }
      } catch (e) {
        console.error("Failed to read config", e);
        toast('无法读取 AdGuardHome 配置，已重定向到默认端口 3000');
        window.location.href = `http://127.0.0.1:3000`;
      }
    };

    fetchAndRedirect();
  }, []);

  return <div>Redirecting...</div>;
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
)
