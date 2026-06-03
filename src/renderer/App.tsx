import React, { useState } from 'react';
import QueueScreen from '../screens/QueueScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProblemsScreen from '../screens/ProblemsScreen';
import ForecastScreen from '../screens/ForecastScreen';

type Screen = 'queue' | 'forecast' | 'history' | 'problems' | 'settings';

export default function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>('queue');

  return (
    <div className="app">
      <div className="titlebar">
        <span className="titlebar-title">Cadence</span>
        <nav className="titlebar-nav">
          <button
            className={`nav-btn${screen === 'queue' ? ' active' : ''}`}
            onClick={() => setScreen('queue')}
          >
            Today
          </button>
          <button
            className={`nav-btn${screen === 'forecast' ? ' active' : ''}`}
            onClick={() => setScreen('forecast')}
          >
            Forecast
          </button>
          <button
            className={`nav-btn${screen === 'history' ? ' active' : ''}`}
            onClick={() => setScreen('history')}
          >
            History
          </button>
          <button
            className={`nav-btn${screen === 'problems' ? ' active' : ''}`}
            onClick={() => setScreen('problems')}
          >
            Problems
          </button>
          <button
            className={`nav-btn${screen === 'settings' ? ' active' : ''}`}
            onClick={() => setScreen('settings')}
          >
            Settings
          </button>
        </nav>
      </div>
      <div className="main-content">
        {screen === 'queue' && <QueueScreen />}
        {screen === 'forecast' && <ForecastScreen />}
        {screen === 'history' && <HistoryScreen />}
        {screen === 'problems' && <ProblemsScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </div>
    </div>
  );
}
