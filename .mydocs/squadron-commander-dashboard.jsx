import React, { useState, useMemo } from 'react';
import { Plane, Users, AlertTriangle, Clock, Moon, Navigation, CheckCircle, XCircle, ChevronRight, Calendar, Target, TrendingUp, Shield, Radio } from 'lucide-react';

const flightData = [
  { id: 1, piloto: "Carlos Mendoza", fecha: "15/03/2024", tiempo: "2:45", nocturna: "Sí", ifr: "Sí", instrumental: "No", cruzada: "Sí", periodo: 2, despegue: "08:30", toma: "11:15", indicativo: "EC-ABC" },
  { id: 2, piloto: "María García", fecha: "18/03/2024", tiempo: "1:30", nocturna: "No", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 1, despegue: "14:00", toma: "15:30", indicativo: "EC-DEF" },
  { id: 3, piloto: "Luis Fernández", fecha: "20/03/2024", tiempo: "3:15", nocturna: "Sí", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 3, despegue: "06:45", toma: "10:00", indicativo: "EC-GHI" },
  { id: 4, piloto: "Ana Rodríguez", fecha: "22/03/2024", tiempo: "0:55", nocturna: "No", ifr: "No", instrumental: "No", cruzada: "No", periodo: 4, despegue: "16:20", toma: "17:15", indicativo: "EC-JKL" },
  { id: 5, piloto: "Pedro Sánchez", fecha: "25/03/2024", tiempo: "2:10", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "Sí", periodo: 2, despegue: "19:30", toma: "21:40", indicativo: "EC-MNO" },
  { id: 6, piloto: "Elena Martín", fecha: "28/03/2024", tiempo: "1:45", nocturna: "No", ifr: "Sí", instrumental: "No", cruzada: "Sí", periodo: 1, despegue: "09:00", toma: "10:45", indicativo: "EC-PQR" },
  { id: 7, piloto: "Jorge López", fecha: "01/04/2024", tiempo: "2:30", nocturna: "Sí", ifr: "No", instrumental: "Sí", cruzada: "No", periodo: 3, despegue: "20:00", toma: "22:30", indicativo: "EC-STU" },
  { id: 8, piloto: "Patricia Ruiz", fecha: "05/04/2024", tiempo: "1:20", nocturna: "No", ifr: "Sí", instrumental: "Sí", cruzada: "Sí", periodo: 2, despegue: "11:30", toma: "12:50", indicativo: "EC-VWX" },
  { id: 9, piloto: "Miguel Torres", fecha: "08/04/2024", tiempo: "3:00", nocturna: "Sí", ifr: "Sí", instrumental: "No", cruzada: "No", periodo: 4, despegue: "05:30", toma: "08:30", indicativo: "EC-YZA" },
  { id: 10, piloto: "Laura Díaz", fecha: "12/04/2024", tiempo: "2:20", nocturna: "No", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 1, despegue: "13:15", toma: "15:35", indicativo: "EC-BCD" },
  { id: 11, piloto: "Carlos Mendoza", fecha: "15/04/2024", tiempo: "1:50", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 3, despegue: "18:45", toma: "20:35", indicativo: "EC-ABC" },
  { id: 12, piloto: "María García", fecha: "18/04/2024", tiempo: "2:40", nocturna: "No", ifr: "No", instrumental: "No", cruzada: "Sí", periodo: 2, despegue: "10:00", toma: "12:40", indicativo: "EC-DEF" },
  { id: 13, piloto: "Luis Fernández", fecha: "22/04/2024", tiempo: "1:15", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "Sí", periodo: 4, despegue: "21:00", toma: "22:15", indicativo: "EC-GHI" },
  { id: 14, piloto: "Ana Rodríguez", fecha: "25/04/2024", tiempo: "3:30", nocturna: "No", ifr: "Sí", instrumental: "No", cruzada: "No", periodo: 1, despegue: "07:00", toma: "10:30", indicativo: "EC-JKL" },
  { id: 15, piloto: "Pedro Sánchez", fecha: "28/04/2024", tiempo: "2:05", nocturna: "Sí", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 2, despegue: "17:30", toma: "19:35", indicativo: "EC-MNO" },
  { id: 16, piloto: "Elena Martín", fecha: "02/05/2024", tiempo: "1:40", nocturna: "No", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 3, despegue: "12:00", toma: "13:40", indicativo: "EC-PQR" },
  { id: 17, piloto: "Jorge López", fecha: "05/05/2024", tiempo: "2:55", nocturna: "Sí", ifr: "Sí", instrumental: "No", cruzada: "Sí", periodo: 4, despegue: "19:00", toma: "21:55", indicativo: "EC-STU" },
  { id: 18, piloto: "Patricia Ruiz", fecha: "08/05/2024", tiempo: "1:25", nocturna: "No", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 1, despegue: "08:45", toma: "10:10", indicativo: "EC-VWX" },
  { id: 19, piloto: "Miguel Torres", fecha: "12/05/2024", tiempo: "2:35", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 2, despegue: "20:30", toma: "23:05", indicativo: "EC-YZA" },
  { id: 20, piloto: "Laura Díaz", fecha: "15/05/2024", tiempo: "3:10", nocturna: "No", ifr: "No", instrumental: "No", cruzada: "Sí", periodo: 3, despegue: "06:00", toma: "09:10", indicativo: "EC-BCD" },
  { id: 21, piloto: "Carlos Mendoza", fecha: "18/05/2024", tiempo: "1:55", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "Sí", periodo: 4, despegue: "15:30", toma: "17:25", indicativo: "EC-ABC" },
  { id: 22, piloto: "María García", fecha: "22/05/2024", tiempo: "2:25", nocturna: "No", ifr: "Sí", instrumental: "No", cruzada: "No", periodo: 1, despegue: "09:30", toma: "11:55", indicativo: "EC-DEF" },
  { id: 23, piloto: "Luis Fernández", fecha: "25/05/2024", tiempo: "1:35", nocturna: "Sí", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 2, despegue: "18:00", toma: "19:35", indicativo: "EC-GHI" },
  { id: 24, piloto: "Ana Rodríguez", fecha: "28/05/2024", tiempo: "2:50", nocturna: "No", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 3, despegue: "11:00", toma: "13:50", indicativo: "EC-JKL" },
  { id: 25, piloto: "Pedro Sánchez", fecha: "01/06/2024", tiempo: "3:20", nocturna: "Sí", ifr: "Sí", instrumental: "No", cruzada: "Sí", periodo: 4, despegue: "16:45", toma: "20:05", indicativo: "EC-MNO" },
  { id: 26, piloto: "Elena Martín", fecha: "05/06/2024", tiempo: "1:10", nocturna: "No", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 1, despegue: "07:30", toma: "08:40", indicativo: "EC-PQR" },
  { id: 27, piloto: "Jorge López", fecha: "08/06/2024", tiempo: "2:15", nocturna: "Sí", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 2, despegue: "21:15", toma: "23:30", indicativo: "EC-STU" },
  { id: 28, piloto: "Patricia Ruiz", fecha: "12/06/2024", tiempo: "1:45", nocturna: "No", ifr: "Sí", instrumental: "No", cruzada: "Sí", periodo: 3, despegue: "14:30", toma: "16:15", indicativo: "EC-VWX" },
  { id: 29, piloto: "Miguel Torres", fecha: "15/06/2024", tiempo: "2:00", nocturna: "Sí", ifr: "No", instrumental: "Sí", cruzada: "Sí", periodo: 4, despegue: "19:45", toma: "21:45", indicativo: "EC-YZA" },
  { id: 30, piloto: "Laura Díaz", fecha: "18/06/2024", tiempo: "3:05", nocturna: "No", ifr: "Sí", instrumental: "Sí", cruzada: "No", periodo: 1, despegue: "08:00", toma: "11:05", indicativo: "EC-BCD" }
];

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export default function SquadronDashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedPilot, setSelectedPilot] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [missionType, setMissionType] = useState('');

  const pilotStats = useMemo(() => {
    const stats = {};
    flightData.forEach(flight => {
      if (!stats[flight.piloto]) {
        stats[flight.piloto] = {
          nombre: flight.piloto,
          totalVuelos: 0,
          tiempoTotal: 0,
          nocturnas: 0,
          ifr: 0,
          instrumental: 0,
          cruzada: 0,
          ultimoVuelo: flight.fecha,
          periodos: { 1: 0, 2: 0, 3: 0, 4: 0 }
        };
      }
      stats[flight.piloto].totalVuelos++;
      stats[flight.piloto].tiempoTotal += parseTime(flight.tiempo);
      if (flight.nocturna === "Sí") stats[flight.piloto].nocturnas++;
      if (flight.ifr === "Sí") stats[flight.piloto].ifr++;
      if (flight.instrumental === "Sí") stats[flight.piloto].instrumental++;
      if (flight.cruzada === "Sí") stats[flight.piloto].cruzada++;
      stats[flight.piloto].periodos[flight.periodo]++;
      stats[flight.piloto].ultimoVuelo = flight.fecha;
    });
    return Object.values(stats).map(p => ({
      ...p,
      tiempoFormateado: `${Math.floor(p.tiempoTotal / 60)}:${String(p.tiempoTotal % 60).padStart(2, '0')}`,
      operatividad: Math.min(100, Math.round((p.nocturnas + p.ifr + p.instrumental + p.cruzada) / (p.totalVuelos * 0.5) * 25))
    }));
  }, []);

  const alerts = useMemo(() => {
    const alertList = [];
    pilotStats.forEach(pilot => {
      if (pilot.nocturnas < 2) alertList.push({ type: 'warning', pilot: pilot.nombre, message: 'Requiere más tomas nocturnas', icon: Moon });
      if (pilot.ifr < 2) alertList.push({ type: 'critical', pilot: pilot.nombre, message: 'Insuficientes aproximaciones IFR', icon: Navigation });
      if (pilot.totalVuelos < 3) alertList.push({ type: 'info', pilot: pilot.nombre, message: 'Bajo número de vuelos totales', icon: Plane });
    });
    return alertList.slice(0, 8);
  }, [pilotStats]);

  const totalHours = useMemo(() => {
    const mins = pilotStats.reduce((acc, p) => acc + p.tiempoTotal, 0);
    return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
  }, [pilotStats]);

  const avgOperativity = useMemo(() => {
    return Math.round(pilotStats.reduce((acc, p) => acc + p.operatividad, 0) / pilotStats.length);
  }, [pilotStats]);

  const StatCard = ({ icon: Icon, label, value, subvalue, color }) => (
    <div className="relative overflow-hidden" style={{
      background: 'linear-gradient(145deg, #1a1f2e 0%, #0d1117 100%)',
      border: '1px solid #2a3441',
      borderRadius: '4px',
      padding: '20px'
    }}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
        <Icon size={96} />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div style={{ background: color, padding: '8px', borderRadius: '4px' }}>
          <Icon size={18} color="#0d1117" />
        </div>
        <span style={{ color: '#8b949e', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: '#e6edf3', fontFamily: 'monospace' }}>{value}</div>
      {subvalue && <div style={{ color: '#8b949e', fontSize: '13px', marginTop: '4px' }}>{subvalue}</div>}
    </div>
  );

  const PilotCard = ({ pilot, onClick }) => {
    const getStatusColor = (op) => op >= 80 ? '#3fb950' : op >= 50 ? '#d29922' : '#f85149';
    return (
      <div 
        onClick={() => onClick(pilot)}
        style={{
          background: 'linear-gradient(145deg, #161b22 0%, #0d1117 100%)',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#f0883e'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#30363d'}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div style={{ color: '#e6edf3', fontWeight: '600', fontSize: '15px' }}>{pilot.nombre}</div>
            <div style={{ color: '#8b949e', fontSize: '12px' }}>Último vuelo: {pilot.ultimoVuelo}</div>
          </div>
          <div style={{
            background: getStatusColor(pilot.operatividad),
            color: '#0d1117',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            {pilot.operatividad}%
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center" style={{ fontSize: '11px' }}>
          <div style={{ background: '#21262d', padding: '8px 4px', borderRadius: '4px' }}>
            <div style={{ color: '#f0883e', fontWeight: '700', fontSize: '16px' }}>{pilot.totalVuelos}</div>
            <div style={{ color: '#8b949e' }}>Vuelos</div>
          </div>
          <div style={{ background: '#21262d', padding: '8px 4px', borderRadius: '4px' }}>
            <div style={{ color: '#58a6ff', fontWeight: '700', fontSize: '16px' }}>{pilot.tiempoFormateado}</div>
            <div style={{ color: '#8b949e' }}>Horas</div>
          </div>
          <div style={{ background: '#21262d', padding: '8px 4px', borderRadius: '4px' }}>
            <div style={{ color: '#a371f7', fontWeight: '700', fontSize: '16px' }}>{pilot.nocturnas}</div>
            <div style={{ color: '#8b949e' }}>Noct.</div>
          </div>
          <div style={{ background: '#21262d', padding: '8px 4px', borderRadius: '4px' }}>
            <div style={{ color: '#3fb950', fontWeight: '700', fontSize: '16px' }}>{pilot.ifr}</div>
            <div style={{ color: '#8b949e' }}>IFR</div>
          </div>
        </div>
      </div>
    );
  };

  const AlertItem = ({ alert }) => {
    const colors = {
      critical: { bg: '#f8514926', border: '#f85149', text: '#f85149' },
      warning: { bg: '#d2992226', border: '#d29922', text: '#d29922' },
      info: { bg: '#58a6ff26', border: '#58a6ff', text: '#58a6ff' }
    };
    const c = colors[alert.type];
    return (
      <div style={{
        background: c.bg,
        borderLeft: `3px solid ${c.border}`,
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '0 4px 4px 0'
      }}>
        <div className="flex items-center gap-3">
          <alert.icon size={16} color={c.text} />
          <div>
            <div style={{ color: '#e6edf3', fontSize: '13px', fontWeight: '500' }}>{alert.pilot}</div>
            <div style={{ color: c.text, fontSize: '12px' }}>{alert.message}</div>
          </div>
        </div>
      </div>
    );
  };

  const AssignmentModal = () => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1f2e 0%, #0d1117 100%)',
        border: '1px solid #f0883e',
        borderRadius: '8px',
        padding: '24px',
        width: '480px',
        maxWidth: '90vw'
      }}>
        <div className="flex justify-between items-center mb-6">
          <h3 style={{ color: '#e6edf3', fontSize: '18px', fontWeight: '600' }}>Asignar Misión</h3>
          <button onClick={() => setAssignmentModal(false)} style={{
            background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '20px'
          }}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#8b949e', fontSize: '12px', display: 'block', marginBottom: '8px' }}>PILOTO SELECCIONADO</label>
          <select 
            style={{
              width: '100%', background: '#21262d', border: '1px solid #30363d',
              color: '#e6edf3', padding: '12px', borderRadius: '4px', fontSize: '14px'
            }}
            value={selectedPilot?.nombre || ''}
            onChange={e => setSelectedPilot(pilotStats.find(p => p.nombre === e.target.value))}
          >
            <option value="">Seleccionar piloto...</option>
            {pilotStats.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre} ({p.operatividad}%)</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#8b949e', fontSize: '12px', display: 'block', marginBottom: '8px' }}>TIPO DE MISIÓN</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'nocturna', label: 'Vuelo Nocturno', icon: Moon },
              { id: 'ifr', label: 'Práctica IFR', icon: Navigation },
              { id: 'instruccion', label: 'Instrucción', icon: Target },
              { id: 'patrulla', label: 'Patrulla', icon: Shield }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMissionType(m.id)}
                style={{
                  background: missionType === m.id ? '#f0883e' : '#21262d',
                  color: missionType === m.id ? '#0d1117' : '#e6edf3',
                  border: `1px solid ${missionType === m.id ? '#f0883e' : '#30363d'}`,
                  padding: '12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <m.icon size={16} /> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#8b949e', fontSize: '12px', display: 'block', marginBottom: '8px' }}>PERIODO</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(p => (
              <button key={p} style={{
                flex: 1, background: '#21262d', border: '1px solid #30363d',
                color: '#e6edf3', padding: '10px', borderRadius: '4px', cursor: 'pointer'
              }}>P{p}</button>
            ))}
          </div>
        </div>

        {selectedPilot && (
          <div style={{ background: '#21262d', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '8px' }}>ANÁLISIS DE RECOMENDACIÓN</div>
            <div style={{ color: '#e6edf3', fontSize: '13px', lineHeight: '1.6' }}>
              {selectedPilot.nocturnas < 2 && <div>⚠️ Priorizar vuelos nocturnos ({selectedPilot.nocturnas}/2 mínimo)</div>}
              {selectedPilot.ifr < 2 && <div>⚠️ Requiere práctica IFR adicional ({selectedPilot.ifr}/2 mínimo)</div>}
              {selectedPilot.operatividad >= 80 && <div>✅ Piloto en estado óptimo para cualquier misión</div>}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setAssignmentModal(false)} style={{
            flex: 1, background: 'transparent', border: '1px solid #30363d',
            color: '#8b949e', padding: '12px', borderRadius: '4px', cursor: 'pointer'
          }}>Cancelar</button>
          <button style={{
            flex: 1, background: '#3fb950', border: 'none',
            color: '#0d1117', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'
          }}>Confirmar Asignación</button>
        </div>
      </div>
    </div>
  );

  const PilotDetail = ({ pilot }) => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1f2e 0%, #0d1117 100%)',
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '24px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 style={{ color: '#e6edf3', fontSize: '20px', fontWeight: '600' }}>{pilot.nombre}</h3>
            <div style={{ color: '#8b949e', fontSize: '13px' }}>Perfil de Operatividad</div>
          </div>
          <button onClick={() => setSelectedPilot(null)} style={{
            background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '24px'
          }}>×</button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div style={{ background: '#21262d', padding: '16px', borderRadius: '6px' }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '4px' }}>HORAS TOTALES</div>
            <div style={{ color: '#58a6ff', fontSize: '28px', fontWeight: '700', fontFamily: 'monospace' }}>{pilot.tiempoFormateado}</div>
          </div>
          <div style={{ background: '#21262d', padding: '16px', borderRadius: '6px' }}>
            <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '4px' }}>OPERATIVIDAD</div>
            <div style={{ color: pilot.operatividad >= 80 ? '#3fb950' : pilot.operatividad >= 50 ? '#d29922' : '#f85149', fontSize: '28px', fontWeight: '700' }}>{pilot.operatividad}%</div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: '#e6edf3', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Requisitos Cumplidos</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tomas Nocturnas', value: pilot.nocturnas, min: 2, icon: Moon },
              { label: 'Aproximaciones IFR', value: pilot.ifr, min: 2, icon: Navigation },
              { label: 'Vuelo Instrumental', value: pilot.instrumental, min: 1, icon: Radio },
              { label: 'Tomas Cruzadas', value: pilot.cruzada, min: 1, icon: Plane }
            ].map(req => (
              <div key={req.label} style={{
                background: req.value >= req.min ? '#3fb95015' : '#f8514915',
                border: `1px solid ${req.value >= req.min ? '#3fb950' : '#f85149'}`,
                padding: '12px',
                borderRadius: '4px'
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {req.value >= req.min ? <CheckCircle size={14} color="#3fb950" /> : <XCircle size={14} color="#f85149" />}
                  <span style={{ color: '#e6edf3', fontSize: '12px' }}>{req.label}</span>
                </div>
                <div style={{ color: req.value >= req.min ? '#3fb950' : '#f85149', fontSize: '18px', fontWeight: '700' }}>
                  {req.value} / {req.min}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: '#e6edf3', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Distribución por Periodo</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(p => (
              <div key={p} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  background: `linear-gradient(to top, #f0883e ${pilot.periodos[p] * 25}%, #21262d ${pilot.periodos[p] * 25}%)`,
                  height: '60px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '8px'
                }}>
                  <span style={{ color: '#e6edf3', fontSize: '14px', fontWeight: '700' }}>{pilot.periodos[p]}</span>
                </div>
                <div style={{ color: '#8b949e', fontSize: '11px', marginTop: '4px' }}>P{p}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setSelectedPilot(null); setAssignmentModal(true); }} style={{
            flex: 1, background: '#f0883e', border: 'none',
            color: '#0d1117', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'
          }}>Asignar Misión</button>
          <button onClick={() => setSelectedPilot(null)} style={{
            flex: 1, background: 'transparent', border: '1px solid #30363d',
            color: '#8b949e', padding: '12px', borderRadius: '4px', cursor: 'pointer'
          }}>Cerrar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      color: '#e6edf3'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .gap-4 { gap: 16px; }
        .gap-6 { gap: 24px; }
        .text-center { text-align: center; }
        .mb-2 { margin-bottom: 8px; }
        .mb-3 { margin-bottom: 12px; }
        .mb-6 { margin-bottom: 24px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pulse { animation: pulse 2s infinite; }
      `}</style>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, #0d1117 0%, #1a1f2e 50%, #0d1117 100%)',
        borderBottom: '1px solid #f0883e',
        padding: '16px 32px'
      }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div style={{
              background: 'linear-gradient(145deg, #f0883e, #d67020)',
              padding: '10px',
              borderRadius: '8px'
            }}>
              <Shield size={28} color="#0d1117" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '22px', fontWeight: '700', letterSpacing: '2px' }}>
                CENTRO DE MANDO
              </h1>
              <div style={{ color: '#8b949e', fontSize: '12px', letterSpacing: '1px' }}>ESCUADRÓN ALFA • SISTEMA DE GESTIÓN OPERATIVA</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="pulse" style={{ width: '8px', height: '8px', background: '#3fb950', borderRadius: '50%' }}></div>
              <span style={{ color: '#3fb950', fontSize: '12px' }}>SISTEMA OPERATIVO</span>
            </div>
            <div style={{ color: '#8b949e', fontSize: '13px', fontFamily: 'monospace' }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 32px' }}>
        <div className="flex gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'pilotos', label: 'Pilotos', icon: Users },
            { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
            { id: 'vuelos', label: 'Registro Vuelos', icon: Plane }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                background: activeView === tab.id ? '#21262d' : 'transparent',
                border: 'none',
                borderBottom: activeView === tab.id ? '2px solid #f0883e' : '2px solid transparent',
                color: activeView === tab.id ? '#e6edf3' : '#8b949e',
                padding: '14px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '24px 32px' }}>
        {activeView === 'dashboard' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label="Pilotos Activos" value={pilotStats.length} subvalue="100% disponibles" color="#58a6ff" />
              <StatCard icon={Clock} label="Horas Totales" value={totalHours} subvalue="Acumulado escuadrón" color="#f0883e" />
              <StatCard icon={Plane} label="Vuelos Realizados" value={flightData.length} subvalue="Último trimestre" color="#a371f7" />
              <StatCard icon={Target} label="Operatividad Media" value={`${avgOperativity}%`} subvalue="Estado del escuadrón" color="#3fb950" />
            </div>

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* Pilots Overview */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Estado de Pilotos</h2>
                  <button 
                    onClick={() => setAssignmentModal(true)}
                    style={{
                      background: '#f0883e',
                      border: 'none',
                      color: '#0d1117',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plane size={14} /> Nueva Asignación
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {pilotStats.map(pilot => (
                    <PilotCard key={pilot.nombre} pilot={pilot} onClick={setSelectedPilot} />
                  ))}
                </div>
              </div>

              {/* Alerts Panel */}
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Alertas Operativas</h2>
                <div style={{
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  {alerts.length === 0 ? (
                    <div style={{ color: '#3fb950', textAlign: 'center', padding: '20px' }}>
                      <CheckCircle size={32} style={{ marginBottom: '8px' }} />
                      <div>Sin alertas pendientes</div>
                    </div>
                  ) : (
                    alerts.map((alert, i) => <AlertItem key={i} alert={alert} />)
                  )}
                </div>

                {/* Quick Actions */}
                <h2 style={{ fontSize: '16px', fontWeight: '600', margin: '24px 0 12px' }}>Acciones Rápidas</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Programar vuelo nocturno', icon: Moon },
                    { label: 'Revisión de cualificaciones', icon: CheckCircle },
                    { label: 'Generar informe mensual', icon: Calendar }
                  ].map((action, i) => (
                    <button
                      key={i}
                      style={{
                        background: '#21262d',
                        border: '1px solid #30363d',
                        color: '#e6edf3',
                        padding: '12px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13px'
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <action.icon size={16} color="#f0883e" />
                        {action.label}
                      </span>
                      <ChevronRight size={16} color="#8b949e" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'pilotos' && (
          <div className="grid grid-cols-3 gap-4">
            {pilotStats.map(pilot => (
              <PilotCard key={pilot.nombre} pilot={pilot} onClick={setSelectedPilot} />
            ))}
          </div>
        )}

        {activeView === 'alertas' && (
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Centro de Alertas</h2>
            {alerts.map((alert, i) => <AlertItem key={i} alert={alert} />)}
          </div>
        )}

        {activeView === 'vuelos' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#21262d' }}>
                  {['Piloto', 'Fecha', 'Tiempo', 'Noct.', 'IFR', 'Instr.', 'Cruz.', 'Per.', 'Despegue', 'Toma', 'Indicativo'].map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: 'left', color: '#8b949e', borderBottom: '1px solid #30363d' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flightData.map(flight => (
                  <tr key={flight.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 12px', color: '#e6edf3' }}>{flight.piloto}</td>
                    <td style={{ padding: '10px 12px', color: '#8b949e' }}>{flight.fecha}</td>
                    <td style={{ padding: '10px 12px', color: '#58a6ff', fontFamily: 'monospace' }}>{flight.tiempo}</td>
                    <td style={{ padding: '10px 12px' }}>{flight.nocturna === 'Sí' ? <CheckCircle size={14} color="#3fb950" /> : <XCircle size={14} color="#484f58" />}</td>
                    <td style={{ padding: '10px 12px' }}>{flight.ifr === 'Sí' ? <CheckCircle size={14} color="#3fb950" /> : <XCircle size={14} color="#484f58" />}</td>
                    <td style={{ padding: '10px 12px' }}>{flight.instrumental === 'Sí' ? <CheckCircle size={14} color="#3fb950" /> : <XCircle size={14} color="#484f58" />}</td>
                    <td style={{ padding: '10px 12px' }}>{flight.cruzada === 'Sí' ? <CheckCircle size={14} color="#3fb950" /> : <XCircle size={14} color="#484f58" />}</td>
                    <td style={{ padding: '10px 12px', color: '#f0883e', fontWeight: '600' }}>P{flight.periodo}</td>
                    <td style={{ padding: '10px 12px', color: '#8b949e', fontFamily: 'monospace' }}>{flight.despegue}</td>
                    <td style={{ padding: '10px 12px', color: '#8b949e', fontFamily: 'monospace' }}>{flight.toma}</td>
                    <td style={{ padding: '10px 12px', color: '#a371f7', fontWeight: '600' }}>{flight.indicativo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedPilot && <PilotDetail pilot={selectedPilot} />}
      {assignmentModal && <AssignmentModal />}
    </div>
  );
}
