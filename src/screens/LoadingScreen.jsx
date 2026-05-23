import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  '照片正在飛往愛情的彼岸…',
  '把幸福打包成像素…',
  '正在灑上玫瑰花瓣…',
  '讓回憶定格成永恆…',
  '愛情快遞，配送中…',
  '把笑容存進伺服器…',
  '正在為照片加上祝福…',
  '美好時光，即將送達…',
];

function randomMessage(exclude) {
  const options = MESSAGES.filter((m) => m !== exclude);
  return options[Math.floor(Math.random() * options.length)];
}

export default function LoadingScreen() {
  const [message, setMessage] = useState(MESSAGES[0]);
  const [opacity, setOpacity] = useState(1);
  const timerRef = useRef(null);
  const currentRef = useRef(MESSAGES[0]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        const next = randomMessage(currentRef.current);
        currentRef.current = next;
        setMessage(next);
        setOpacity(1);
      }, 300);
    }, 2800);

    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <section className="stage">
      <div className="loading-panel">
        <div className="loading-spinner" />
        <h2>資料處理中</h2>
        <p
          className="loading-message"
          style={{ opacity, transition: 'opacity 0.3s ease' }}
        >
          {message}
        </p>
      </div>
    </section>
  );
}
