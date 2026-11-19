import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, X, Sparkles, Users, House, Compass, RotateCw, MapPin, ArrowLeft } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function ProfileCard({ profile, onSwipe, disabled }) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const start = useRef(null);
  const threshold = 105;

  const finish = async (direction) => {
    if (busy || disabled) return;
    setBusy(true);
    await onSwipe(direction);
    setDrag({ x: 0, y: 0 });
    setBusy(false);
  };

  const onPointerDown = (event) => {
    if (busy || disabled) return;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!start.current || busy) return;
    setDrag({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    const x = drag.x;
    start.current = null;
    if (x > threshold) finish("like");
    else if (x < -threshold) finish("pass");
    else setDrag({ x: 0, y: 0 });
  };

  const rotation = drag.x / 18;
  return (
    <div
      className={`profile-card ${busy ? "card-busy" : ""}`}
      style={{ transform: `translate(${drag.x}px, ${drag.y * 0.25}px) rotate(${rotation}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { start.current = null; setDrag({x:0,y:0}); }}
    >
      <img className="profile-photo" src={profile.photo} alt={`${profile.name}'s profile`} draggable="false"
        onError={(e) => { e.currentTarget.src = "https://placehold.co/600x800/f0e9e5/675b55?text=Profile"; }} />
      <div className={`swipe-stamp like-stamp ${drag.x > 35 ? "visible" : ""}`}>LIKE</div>
      <div className={`swipe-stamp pass-stamp ${drag.x < -35 ? "visible" : ""}`}>PASS</div>
      <div className="photo-shade" />
      <div className="profile-content">
        <div className="profile-heading"><h2>{profile.name}, {profile.age}</h2><span className="verified">✓</span></div>
        <div className="location"><MapPin size={15}/>{profile.city}</div>
        <p className="bio">{profile.bio}</p>
        <div className="interest-list">{profile.interests.map(tag => <span key={tag}>{tag}</span>)}</div>
      </div>
    </div>
  );
}

function MatchModal({ profile, onClose }) {
  if (!profile) return null;
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="It's a match">
    <div className="match-modal">
      <div className="sparkle"><Sparkles size={30}/></div>
      <p className="eyebrow">GOOD THINGS START HERE</p>
      <h2>It’s a match!</h2>
      <p>You and {profile.name} liked each other.</p>
      <img src={profile.photo} alt={profile.name} />
      <button className="primary-button" onClick={onClose}>Keep discovering</button>
    </div>
  </div>;
}

export default function App() {
  const [tab, setTab] = useState("discover");
  const [profiles, setProfiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchPopup, setMatchPopup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeed = useCallback(async () => {
    const data = await api("/feed");
    setProfiles(data.profiles || []);
  }, []);
  const loadMatches = useCallback(async () => {
    const data = await api("/matches");
    setMatches(data.matches || []);
  }, []);

  useEffect(() => {
    Promise.all([loadFeed(), loadMatches()])
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadFeed, loadMatches]);

  const swipe = async (direction) => {
    if (!profiles.length) return;
    const current = profiles[0];
    setError("");
    try {
      const result = await api("/swipe", {
        method: "POST",
        body: JSON.stringify({ profileId: current.id, direction })
      });
      setProfiles(old => old.filter(p => p.id !== current.id));
      if (result.isMatch && result.match) {
        setMatchPopup(result.match);
        await loadMatches();
      }
    } catch (err) {
      setError(err.message);
      await loadFeed();
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try { await Promise.all([loadFeed(), loadMatches()]); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">c</span><span>coy</span></div>
      <div className="topbar-caption">A little closer to a connection.</div>
      <button className="icon-button refresh-button" onClick={refresh} aria-label="Refresh"><RotateCw size={18}/></button>
    </header>

    <main className="main-content">
      {tab === "home" ? <section className="home-placeholder">
        <div className="placeholder-icon"><House size={28}/></div>
        <h1>Home</h1><p>Your existing Coy experience will live here.</p>
      </section> : tab === "matches" ? <section className="matches-page">
        <div className="section-title"><div><p className="eyebrow">YOUR CONNECTIONS</p><h1>Matches <span>{matches.length}</span></h1></div></div>
        {matches.length === 0 ? <div className="empty-state compact"><div className="empty-icon"><Heart size={26}/></div><h2>No matches yet</h2><p>When you and someone like each other, you’ll find them here.</p><button className="primary-button" onClick={() => setTab("discover")}>Explore profiles</button></div> :
          <div className="matches-grid">{matches.map(person => <article className="match-card" key={person.id}>
            <img src={person.photo} alt={person.name}/><div><h3>{person.name}, {person.age}</h3><p><MapPin size={13}/>{person.city}</p></div>
          </article>)}</div>}
      </section> : <section className="discover-page">
        <div className="discover-heading"><div><p className="eyebrow">FIND YOUR PEOPLE</p><h1>Discover</h1><p className="subheading">Good connections start with a hello.</p></div><div className="count-pill">{profiles.length} left</div></div>
        {error && <div className="error-banner">{error} <button onClick={refresh}>Retry</button></div>}
        {loading ? <div className="loading-state"><div className="loader"/><p>Finding your people…</p></div> :
          profiles.length ? <div className="discovery-layout">
            <div className="card-area"><ProfileCard key={profiles[0].id} profile={profiles[0]} onSwipe={swipe}/>
              <p className="swipe-hint">← Pass <span>Drag the card</span> Like →</p>
            </div>
            <div className="action-row">
              <button className="action-button pass-action" onClick={() => swipe("pass")} aria-label="Pass"><X size={27}/></button>
              <button className="action-button like-action" onClick={() => swipe("like")} aria-label="Like"><Heart size={26} fill="currentColor"/></button>
            </div>
          </div> : <div className="empty-state"><div className="empty-icon"><Sparkles size={28}/></div><h2>You’re all caught up</h2><p>You’ve viewed everyone in this batch. Check back for new people soon.</p><button className="primary-button" onClick={refresh}>Refresh feed</button></div>}
      </section>}
    </main>

    <nav className="bottom-nav" aria-label="Main navigation">
      <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}><House size={20}/><span>Home</span></button>
      <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}><Compass size={20}/><span>Discover</span></button>
      <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}><Users size={20}/><span>Matches</span>{matches.length > 0 && <i>{matches.length}</i>}</button>
    </nav>
    <MatchModal profile={matchPopup} onClose={() => setMatchPopup(null)}/>
  </div>;
}
