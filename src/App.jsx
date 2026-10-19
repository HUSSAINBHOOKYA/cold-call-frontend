
import { useEffect, useState } from "react";
import {
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  CircleStop,
  History,
  MessageSquare,
  Sparkles,
  UserRound,
  Save,
  ClipboardList,
  LogOut,
} from "lucide-react";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

const STAGES = [
  {
    title: "Opening",
    objective: "Introduce yourself and establish a natural tone.",
    script:
      "Hi, this is [Your Name] from Meridian Growth Partners. How are you doing today?",
    responses: ["Positive", "Neutral", "Busy", "Not interested"],
  },
  {
    title: "Purpose",
    objective: "Explain briefly why you are calling.",
    script:
      "I'm reaching out to learn how your team is approaching growth and whether there's an opportunity for us to help.",
    responses: [
      "Interested",
      "Needs context",
      "Already have support",
      "Not interested",
    ],
  },
  {
    title: "Permission",
    objective: "Ask permission to continue the conversation.",
    script:
      "Would you be open to a quick conversation to see whether this is relevant to your business?",
    responses: ["Yes", "A little time", "Call later", "No"],
  },
  {
    title: "Their business",
    objective: "Understand the prospect's business in their own words.",
    script:
      "Could you tell me a little about your business and the main priorities for your team right now?",
    responses: ["Growth", "Efficiency", "New markets", "Other"],
  },
  {
    title: "Their need",
    objective: "Capture the problem or goal the prospect actually describes.",
    script:
      "What's the biggest challenge you're working to solve at the moment?",
    responses: [
      "Clear need",
      "Exploring options",
      "No immediate need",
      "Unclear",
    ],
  },
  {
    title: "Objection",
    objective: "Understand concerns without arguing or pressuring.",
    script:
      "That makes sense. Could you tell me a little more about what's making this a concern?",
    responses: [
      "Timing",
      "Budget",
      "Existing provider",
      "Not a priority",
      "Other",
    ],
  },
  {
    title: "Next step",
    objective: "Agree on a specific and appropriate next step.",
    script:
      "Would it make sense to schedule a short follow-up to explore this in more detail?",
    responses: [
      "Meeting agreed",
      "Send information",
      "Follow up later",
      "Declined",
    ],
  },
  {
    title: "Close",
    objective: "Confirm the outcome and end respectfully.",
    script:
      "Thank you for your time. I'll make sure we're aligned on the next step. Have a great day!",
    responses: [
      "Closed positively",
      "Follow-up needed",
      "No further action",
    ],
  },
];

const initialForm = {
  prospectName: "",
  companyName: "",
  prospectRole: "",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
  },
  shell: {
    maxWidth: 1440,
    margin: "0 auto",
    padding: "24px",
  },
  panel: {
    background: "#fff",
    border: "1px solid #e5e9f2",
    borderRadius: 16,
    padding: 22,
  },
  muted: {
    color: "#64748b",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: ".06em",
  },
  input: {
    width: "100%",
    border: "1px solid #dce2ed",
    borderRadius: 9,
    padding: "11px 12px",
    font: "inherit",
    color: "#172033",
    background: "#fff",
  },
  button: {
    border: "1px solid #dce2ed",
    background: "#fff",
    color: "#172033",
    borderRadius: 9,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  primary: {
    border: "1px solid #4338ca",
    background: "#4338ca",
    color: "#fff",
    borderRadius: 9,
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
};

function createEmptyStages(savedRows = []) {
  return STAGES.map((stage, index) => {
    const saved = savedRows.find(
      (row) => Number(row.stage_number) === index + 1
    );

    return {
      stageNumber: index + 1,
      stageName: stage.title,
      response: saved?.prospect_response || "",
      exactWords: saved?.exact_words || "",
      notes: saved?.notes || "",
      completed: saved?.completed || false,
      completedAt: saved?.completed_at || null,
    };
  });
}

function mapDatabaseCall(row, stageRows = []) {
  return {
    id: row.id,
    prospectName: row.prospect_name,
    companyName: row.company_name || "",
    prospectRole: row.prospect_role || "",
    status: row.status,
    currentStage: row.current_stage || 1,
    startedAt: row.started_at || row.created_at,
    endedAt: row.ended_at,
    finalStage: row.final_stage,
    nextStep: row.next_step || "",
    stages: createEmptyStages(stageRows),
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [activeCall, setActiveCall] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [exactWords, setExactWords] = useState("");
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [callHistory, setCallHistory] = useState([]);
  const [view, setView] = useState("call");
  const [notice, setNotice] = useState("");

  const currentStage = STAGES[stageIndex];

  const completedStages = activeCall
    ? activeCall.stages.filter((stage) => stage.completed).length
    : 0;

  // Restore the login session.
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) setSession(data.session);
      } catch (error) {
        console.error("Could not restore session:", error.message);

        if (mounted) {
          setSession(null);
          setNotice("Could not restore your login session. Please sign in again.");
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load calls and their stages from Supabase for the signed-in user.
  useEffect(() => {
    if (!session?.user?.id) {
      setCallHistory([]);
      setActiveCall(null);
      return;
    }

    let cancelled = false;

    async function loadCalls() {
      setDataLoading(true);

      try {
        const { data: rows, error } = await supabase
          .from("calls")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const callRows = rows || [];
        let stageRows = [];

        if (callRows.length > 0) {
          const { data, error: stagesError } = await supabase
            .from("call_stages")
            .select("*")
            .in(
              "call_id",
              callRows.map((row) => row.id)
            );

          if (stagesError) throw stagesError;
          stageRows = data || [];
        }

        const mappedCalls = callRows.map((row) =>
          mapDatabaseCall(
            row,
            stageRows.filter(
              (stage) => Number(stage.call_id) === Number(row.id)
            )
          )
        );

        if (cancelled) return;

        setCallHistory(mappedCalls);

        // Restore an unfinished call after a refresh or a new login.
        const unfinished = mappedCalls.find(
          (call) => call.status === "IN_PROGRESS"
        );

        if (unfinished) {
          setActiveCall(unfinished);

          const firstIncomplete = unfinished.stages.findIndex(
            (stage) => !stage.completed
          );

          const index =
            firstIncomplete === -1
              ? Math.max(
                  0,
                  Math.min((unfinished.currentStage || 1) - 1, 7)
                )
              : firstIncomplete;

          setStageIndex(index);
          setResponse(unfinished.stages[index]?.response || "");
          setExactWords(unfinished.stages[index]?.exactWords || "");
          setNotes(unfinished.stages[index]?.notes || "");
          setNextStep(unfinished.nextStep || "");
        } else {
          setActiveCall(null);
        }
      } catch (error) {
        console.error("Could not load calls:", error);

        if (!cancelled) {
          setNotice(`Could not load calls from Supabase: ${error.message}`);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadCalls();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  function showError(prefix, error) {
    console.error(prefix, error);
    setNotice(`${prefix}: ${error.message || "Unknown error"}`);
  }

  // Create a database record when a new call starts.
  async function startCall(event) {
    event.preventDefault();

    if (!form.prospectName.trim()) {
      setNotice("Enter the prospect's name to start a call.");
      return;
    }

    if (!session?.user?.id) {
      setNotice("Please sign in before starting a call.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("calls")
        .insert({
          user_id: session.user.id,
          prospect_name: form.prospectName.trim(),
          company_name: form.companyName.trim() || null,
          prospect_role: form.prospectRole.trim() || null,
          status: "IN_PROGRESS",
          current_stage: 1,
          next_step: null,
        })
        .select()
        .single();

      if (error) throw error;

      const newCall = mapDatabaseCall(data);

      setActiveCall(newCall);
      setCallHistory((previous) => [
        newCall,
        ...previous.filter((call) => call.id !== newCall.id),
      ]);

      setStageIndex(0);
      setResponse("");
      setExactWords("");
      setNotes("");
      setNextStep("");
      setView("call");
      setNotice("Call created and saved in Supabase.");
    } catch (error) {
      showError("Could not start call", error);
    } finally {
      setSaving(false);
    }
  }

  function loadStage(index, call = activeCall) {
    setStageIndex(index);

    const saved = call?.stages[index];

    setResponse(saved?.response || "");
    setExactWords(saved?.exactWords || "");
    setNotes(saved?.notes || "");
    setNextStep(call?.nextStep || "");
    setNotice("");
  }

  // Save the selected stage and update the parent call record.
  async function saveCurrentStage() {
    if (!activeCall || !session?.user?.id) return null;

    setSaving(true);
    setNotice("");

    const now = new Date().toISOString();
    const updatedStages = [...activeCall.stages];

    updatedStages[stageIndex] = {
      ...updatedStages[stageIndex],
      response,
      exactWords,
      notes,
      completed: true,
      completedAt: now,
    };

    const updatedCall = {
      ...activeCall,
      currentStage: stageIndex + 1,
      stages: updatedStages,
      nextStep: stageIndex === 6 ? response || nextStep : nextStep,
    };

    try {
      const { error: stageError } = await supabase
        .from("call_stages")
        .upsert(
          {
            user_id: session.user.id,
            call_id: activeCall.id,
            stage_number: stageIndex + 1,
            stage_name: currentStage.title,
            prospect_response: response || null,
            exact_words: exactWords || null,
            outcome: response || null,
            notes: notes || null,
            completed: true,
            completed_at: now,
          },
          { onConflict: "call_id,stage_number" }
        );

      if (stageError) throw stageError;

      const { error: callError } = await supabase
        .from("calls")
        .update({
          current_stage: stageIndex + 1,
          next_step: updatedCall.nextStep || null,
        })
        .eq("id", activeCall.id)
        .eq("user_id", session.user.id);

      if (callError) throw callError;

      setActiveCall(updatedCall);
      setCallHistory((previous) =>
        previous.map((call) =>
          call.id === updatedCall.id ? updatedCall : call
        )
      );
      setNotice(`Stage ${stageIndex + 1} saved to Supabase.`);

      return updatedCall;
    } catch (error) {
      showError("Could not save stage", error);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    const savedCall = await saveCurrentStage();

    if (!savedCall) return;

    if (stageIndex < STAGES.length - 1) {
      loadStage(stageIndex + 1, savedCall);
    } else {
      setNotice("All eight stages have been reviewed. Finish the call to complete it.");
    }
  }

  function goPrevious() {
    if (stageIndex > 0) {
      loadStage(stageIndex - 1);
    }
  }

  // Save the current stage first, then mark the call as finished.
  async function finishCall(status) {
    if (!activeCall) return;

    const savedCall = await saveCurrentStage();

    if (!savedCall) return;

    setSaving(true);

    try {
      const finishedAt = new Date().toISOString();
      const finalNextStep = nextStep || savedCall.nextStep || "";

      const { data, error } = await supabase
        .from("calls")
        .update({
          status,
          final_stage: stageIndex + 1,
          ended_at: finishedAt,
          current_stage: stageIndex + 1,
          next_step: finalNextStep || null,
        })
        .eq("id", savedCall.id)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (error) throw error;

      const finished = {
        ...savedCall,
        status: data.status,
        finalStage: data.final_stage,
        endedAt: data.ended_at,
        nextStep: data.next_step || "",
      };

      setCallHistory((previous) => [
        finished,
        ...previous.filter((call) => call.id !== finished.id),
      ]);

      setActiveCall(null);
      setForm(initialForm);
      setView("history");
      setNotice(
        status === "COMPLETED"
          ? "Call completed and saved in Supabase."
          : "Call ended early and saved in Supabase."
      );
    } catch (error) {
      showError("Could not finish call", error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteHistory(id) {
    if (!session?.user?.id) return;

    const confirmed = window.confirm(
      "Delete this call and all its saved stages? This cannot be undone."
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("calls")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setCallHistory((previous) =>
        previous.filter((call) => call.id !== id)
      );

      if (activeCall?.id === id) setActiveCall(null);

      setNotice("Call and its stages deleted from Supabase.");
    } catch (error) {
      showError("Could not delete call", error);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(date) {
    return date ? new Date(date).toLocaleString() : "Date unavailable";
  }

  async function handleSignOut() {
    setNotice("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(`Could not sign out: ${error.message}`);
      return;
    }

    setSession(null);
    setActiveCall(null);
    setCallHistory([]);
    setForm(initialForm);
    setView("call");
  }

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7fb",
          color: "#172033",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading your session...
      </div>
    );
  }

  if (!session) {
    return (
      <Auth
        onAuthenticated={(newSession) => {
          setSession(newSession);
          setNotice("");
        }}
      />
    );
  }

  return (
    <div style={styles.page}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <PhoneCall size={21} />
          </div>
          <div>
            <div className="brand-name">Meridian</div>
            <div className="brand-subtitle">GROWTH PARTNERS</div>
          </div>
        </div>

        <nav className="nav-actions">
          <button
            style={view === "call" ? styles.primary : styles.button}
            onClick={() => {
              setView("call");
              setNotice("");
            }}
          >
            <Phone size={16} /> Active call
          </button>

          <button
            style={view === "history" ? styles.primary : styles.button}
            onClick={() => {
              setView("history");
              setNotice("");
            }}
          >
            <History size={16} /> Past calls ({callHistory.filter(
              (call) => call.status !== "IN_PROGRESS"
            ).length})
          </button>

          <button style={styles.button} onClick={handleSignOut}>
            <LogOut size={16} /> Sign out
          </button>
        </nav>
      </header>

      <main style={styles.shell}>
        <div className="page-heading">
          <div>
            <div className="eyebrow">CALL WORKSPACE</div>
            <h1>Cold Call Assistant</h1>
            <p style={styles.muted}>
              A focused guide for real conversations. Listen first, capture
              their words, and agree on a clear next step.
            </p>
          </div>

          {activeCall && (
            <div className="live-pill">
              <span className="live-dot" /> CALL IN PROGRESS
            </div>
          )}
        </div>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {dataLoading && (
          <div className="notice" role="status">
            Loading your calls from Supabase...
          </div>
        )}

        {view === "history" ? (
          <section style={styles.panel}>
            <div className="section-heading">
              <div>
                <h2>Past calls</h2>
                <p style={styles.muted}>
                  Calls saved to your Supabase account.
                </p>
              </div>

              <button
                style={styles.primary}
                onClick={() => setView("call")}
              >
                <Phone size={16} /> Call workspace
              </button>
            </div>

            {callHistory.filter((call) => call.status !== "IN_PROGRESS")
              .length === 0 ? (
              <div className="empty-state">
                <History size={34} />
                <h3>No completed calls yet</h3>
                <p>
                  Completed calls and calls ended early will appear here.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {callHistory
                  .filter((call) => call.status !== "IN_PROGRESS")
                  .map((call) => (
                    <article className="history-card" key={call.id}>
                      <div className="history-icon">
                        <UserRound size={21} />
                      </div>

                      <div className="history-main">
                        <h3>{call.prospectName}</h3>
                        <p>
                          {call.companyName || "Company not provided"}
                          {call.prospectRole ? ` · ${call.prospectRole}` : ""}
                        </p>

                        <div className="history-meta">
                          <span>
                            <Clock size={13} /> {formatDate(call.startedAt)}
                          </span>
                          <span>
                            Reached stage {call.finalStage || call.currentStage} of 8
                          </span>
                        </div>

                        {call.nextStep && (
                          <p className="next-step-summary">
                            Next step: {call.nextStep}
                          </p>
                        )}
                      </div>

                      <div className="history-side">
                        <span
                          className={`status-tag ${call.status.toLowerCase()}`}
                        >
                          {call.status.replaceAll("_", " ")}
                        </span>

                        <button
                          style={styles.button}
                          onClick={() => {
                            setActiveCall(call);
                            loadStage(0, call);
                            setView("call");
                          }}
                        >
                          Review
                        </button>

                        <button
                          style={styles.button}
                          disabled={saving}
                          onClick={() => deleteHistory(call.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        ) : !activeCall ? (
          <div className="start-grid">
            <section style={styles.panel}>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">GET READY</div>
                  <h2>Start a new call</h2>
                  <p style={styles.muted}>
                    Add the details you know about the prospect.
                  </p>
                </div>

                <div className="form-icon">
                  <PhoneCall size={24} />
                </div>
              </div>

              <form onSubmit={startCall} className="call-form">
                <label>
                  <span style={styles.label}>Prospect name *</span>
                  <input
                    style={styles.input}
                    value={form.prospectName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        prospectName: event.target.value,
                      })
                    }
                    placeholder="e.g. Jordan Lee"
                    required
                  />
                </label>

                <label>
                  <span style={styles.label}>Company</span>
                  <input
                    style={styles.input}
                    value={form.companyName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        companyName: event.target.value,
                      })
                    }
                    placeholder="e.g. Northstar Industries"
                  />
                </label>

                <label>
                  <span style={styles.label}>Prospect role</span>
                  <input
                    style={styles.input}
                    value={form.prospectRole}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        prospectRole: event.target.value,
                      })
                    }
                    placeholder="e.g. Operations Director"
                  />
                </label>

                <button
                  style={styles.primary}
                  type="submit"
                  disabled={saving || dataLoading}
                >
                  <PhoneCall size={17} />
                  {saving ? "Starting..." : "Start call"}
                  <ChevronRight size={17} />
                </button>
              </form>
            </section>

            <aside className="prep-card">
              <div className="prep-icon">
                <ClipboardList size={23} />
              </div>

              <div className="eyebrow">YOUR CALL, YOUR PACE</div>

              <h2>Eight stages. One real conversation.</h2>

              <p>
                Use the guide as a reference, not a script to read word for
                word. Capture what the prospect actually says.
              </p>

              <div className="mini-stage-list">
                {STAGES.map((stage, index) => (
                  <div className="mini-stage" key={stage.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {stage.title}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <>
            <div className="call-summary">
              <div className="prospect-avatar">
                <UserRound size={23} />
              </div>

              <div className="prospect-details">
                <h2>{activeCall.prospectName}</h2>
                <p>
                  {activeCall.companyName || "Company not provided"}
                  {activeCall.prospectRole ? ` · ${activeCall.prospectRole}` : ""}
                </p>
              </div>

              <div className="progress-summary">
                <strong>{completedStages} / 8</strong>
                <span>Stages saved</span>
              </div>
            </div>

            <div className="stage-layout">
              <aside style={styles.panel} className="stage-sidebar">
                <div className="sidebar-title">CALL PROGRESS</div>

                <div className="stage-list">
                  {STAGES.map((stage, index) => {
                    const done = activeCall.stages[index]?.completed;
                    const active = index === stageIndex;

                    return (
                      <button
                        key={stage.title}
                        className={`stage-item ${active ? "active" : ""} ${
                          done ? "done" : ""
                        }`}
                        onClick={() => loadStage(index)}
                      >
                        <span className="stage-number">
                          {done ? <CheckCircle2 size={19} /> : index + 1}
                        </span>

                        <span className="stage-item-text">
                          <strong>{stage.title}</strong>
                          <small>
                            {done
                              ? "Captured"
                              : active
                                ? "Current stage"
                                : "Up next"}
                          </small>
                        </span>

                        {active && <ChevronRight size={16} />}
                      </button>
                    );
                  })}
                </div>

                <div className="sidebar-tip">
                  <Sparkles size={17} />
                  <div>
                    <strong>Listen before moving on</strong>
                    <p>Use their words, not assumptions.</p>
                  </div>
                </div>
              </aside>

              <section style={styles.panel} className="stage-workspace">
                <div className="stage-header">
                  <div>
                    <div className="eyebrow">
                      STAGE {stageIndex + 1} OF 8
                    </div>
                    <h2>{currentStage.title}</h2>
                    <p style={styles.muted}>{currentStage.objective}</p>
                  </div>

                  <span className="stage-badge">
                    {String(stageIndex + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="script-card">
                  <div className="script-title">
                    <MessageSquare size={17} /> Suggested talking point
                  </div>
                  <p>{currentStage.script}</p>
                  <small>Adapt this naturally to the conversation.</small>
                </div>

                <div className="field-block">
                  <label style={styles.label}>
                    Prospect response / outcome
                  </label>

                  <div className="response-options">
                    {currentStage.responses.map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`response-option ${
                          response === option ? "selected" : ""
                        }`}
                        onClick={() => setResponse(option)}
                      >
                        {response === option && <CheckCircle2 size={15} />}
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-block">
                  <label style={styles.label}>
                    Exact words from the prospect
                  </label>

                  <textarea
                    value={exactWords}
                    onChange={(event) => setExactWords(event.target.value)}
                    placeholder={
                      'Capture what they actually said, for example: "Our biggest challenge is finding qualified leads."'
                    }
                    rows={4}
                  />

                  <div className="field-hint">
                    <MessageSquare size={13} /> Capture the prospect's words as
                    accurately as possible.
                  </div>
                </div>

                <div className="field-block">
                  <label style={styles.label}>Your notes</label>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Context, concerns, details to remember..."
                    rows={2}
                  />
                </div>

                {stageIndex === 6 && (
                  <div className="field-block">
                    <label style={styles.label}>Agreed next step</label>

                    <input
                      style={styles.input}
                      value={nextStep}
                      onChange={(event) => setNextStep(event.target.value)}
                      placeholder="e.g. Send overview and follow up Thursday"
                    />
                  </div>
                )}

                <div className="stage-footer">
                  <button
                    style={styles.button}
                    onClick={goPrevious}
                    disabled={stageIndex === 0 || saving}
                  >
                    <ChevronLeft size={17} /> Previous
                  </button>

                  <div className="footer-actions">
                    <button
                      style={styles.button}
                      disabled={saving}
                      onClick={saveCurrentStage}
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save stage"}
                    </button>

                    {stageIndex < 7 ? (
                      <button
                        style={styles.primary}
                        disabled={saving}
                        onClick={goNext}
                      >
                        Save & continue <ChevronRight size={17} />
                      </button>
                    ) : (
                      <button
                        style={styles.primary}
                        disabled={saving}
                        onClick={() => finishCall("COMPLETED")}
                      >
                        <CheckCircle2 size={17} /> Finish call
                      </button>
                    )}
                  </div>
                </div>

                <div className="end-call-row">
                  <span>Need to end the call early?</span>

                  <button
                    className="end-call-button"
                    disabled={saving}
                    onClick={() => finishCall("ENDED_EARLY")}
                  >
                    <CircleStop size={16} /> End call early
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        <footer className="app-footer">
          <span>MERIDIAN GROWTH PARTNERS</span>
          <span>Cold Call Assistant · Working workspace</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
