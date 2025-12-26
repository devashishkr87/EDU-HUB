
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PDFWorkspace from './components/PDFWorkspace';
import SenseiChat from './components/SenseiChat';
import { UserRole, UserProfile, AcademicMaterial, StudyPlanItem } from './types';
import * as gemini from './services/geminiService';
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [materials, setMaterials] = useState<AcademicMaterial[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMaterial, setActiveMaterial] = useState<AcademicMaterial | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>([]);
  const [planDays, setPlanDays] = useState<number>(30);
  const [dailyHours, setDailyHours] = useState<number>(4);
  const [prioritizeTopics, setPrioritizeTopics] = useState<string>("");
  const [avoidTopics, setAvoidTopics] = useState<string>("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [authMode, setAuthMode] = useState<'dummy' | 'firebase'>('dummy');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const mockMaterials: AcademicMaterial[] = [
      {
        id: '1',
        title: 'Advanced Thermodynamics',
        description: 'Comprehensive guide to thermal dynamics and energy laws.',
        subject: 'Physics',
        uploaderId: 't1',
        uploaderName: 'Dr. Arthur Miller',
        fileUrl: 'data:application/pdf;base64,JVBERi0xLjcK...',
        fileName: 'thermo_v1.pdf',
        timestamp: Date.now(),
        type: 'PDF'
      },
      {
        id: '2',
        title: 'History of Modern Europe',
        description: 'Examining political shifts from 1848 to present.',
        subject: 'History',
        uploaderId: 't2',
        uploaderName: 'Prof. Julia Stevens',
        fileUrl: 'data:application/pdf;base64,JVBERi0xLjcK...',
        fileName: 'history_syllabus.pdf',
        timestamp: Date.now() - 86400000,
        type: 'SYLLABUS'
      }
    ];
    setMaterials(mockMaterials);
  }, []);

  const handleLogin = (role: UserRole) => {
    const newUser: UserProfile = {
      uid: Math.random().toString(36).substr(2, 9),
      email: `${role.toLowerCase()}@institution.edu`,
      displayName: role === UserRole.STUDENT ? 'Student User' : 'Professor User',
      role: role
    };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newMaterial: AcademicMaterial = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        subject: formData.get('subject') as string,
        uploaderId: user.uid,
        uploaderName: (formData.get('teacherName') as string) || user.displayName,
        fileUrl: base64,
        fileName: file.name,
        timestamp: Date.now(),
        type: (formData.get('type') as any) || 'PDF'
      };
      setMaterials([newMaterial, ...materials]);
      setActiveTab('dashboard');
    };
    reader.readAsDataURL(file);
  };

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsGeneratingPlan(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Full = event.target?.result as string;
      const base64 = base64Full.split(',')[1];
      try {
        const plan = await gemini.generateStudyPlan(base64, planDays, dailyHours, prioritizeTopics, avoidTopics);
        setStudyPlan(plan);
      } catch (error) {
        alert("Plan generation failed.");
      } finally {
        setIsGeneratingPlan(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-16 text-white flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-2xl mb-8">A</div>
              <h1 className="text-4xl font-extrabold mb-4 leading-tight">AcademiSync AI</h1>
              <p className="text-lg text-blue-100 font-medium leading-relaxed">Integrated academic management and AI learning intelligence for modern institutions.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-300 rounded-full"></span>
                <span className="text-sm font-bold tracking-widest uppercase">Smart Roadmap Generation</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-300 rounded-full"></span>
                <span className="text-sm font-bold tracking-widest uppercase">Advanced Material Analysis</span>
              </div>
            </div>
          </div>

          <div className="p-16 flex flex-col justify-center">
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Institutional Entry</h2>
                <p className="text-sm text-slate-500 font-medium">Select your portal access level</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleLogin(UserRole.STUDENT)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 transition-all text-left flex items-center justify-between">
                  <span>Student Portal</span>
                  <span className="text-xl">🎓</span>
                </button>
                <button onClick={() => handleLogin(UserRole.TEACHER)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-700 hover:border-blue-600 hover:text-blue-600 transition-all text-left flex items-center justify-between">
                  <span>Faculty Access</span>
                  <span className="text-xl">👨‍🏫</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout userRole={user.role} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-8 md:p-12 animate-in fade-in duration-500">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Repository</h2>
                <p className="text-slate-500 font-medium">All shared learning materials for your current semester.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map(mat => (
                <div key={mat.id} className="app-card rounded-2xl p-6 cursor-pointer bg-white" onClick={() => setActiveMaterial(mat)}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-lg uppercase">{mat.type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{mat.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-6">{mat.description}</p>
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{mat.uploaderName.charAt(0)}</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{mat.uploaderName} • {mat.subject}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'study-plan' && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Exam-Oriented Study Roadmap</h2>
              <p className="text-slate-500 max-w-lg mx-auto font-medium">Generate a precision preparation schedule aligned with your exams.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-lg space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Days Available</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        min="1" 
                        max="365" 
                        value={planDays} 
                        onChange={(e) => setPlanDays(parseInt(e.target.value) || 1)}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                      />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Days until Exam</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Daily Capacity</span>
                      <span className="text-blue-600">{dailyHours} Hours</span>
                    </div>
                    <input type="range" min="1" max="15" value={dailyHours} onChange={(e) => setDailyHours(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <input type="file" accept=".pdf" id="syl-up" className="hidden" onChange={handleSyllabusUpload} disabled={isGeneratingPlan} />
                  <label htmlFor="syl-up" className={`flex-1 min-h-[180px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${isGeneratingPlan ? 'bg-slate-50 border-slate-300 opacity-50' : 'bg-slate-50 border-slate-300 hover:border-blue-600 hover:bg-white shadow-inner'}`}>
                    {isGeneratingPlan ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Constructing Roadmap...</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-3xl block mb-2">📄</span>
                        <span className="text-xs font-bold text-slate-600">Upload Syllabus to Begin</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
            
            {studyPlan.length > 0 && (
              <div className="space-y-6 pb-20">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Generated {planDays}-Day Schedule</h3>
                  <button onClick={() => window.print()} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors">Print Roadmap</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {studyPlan.map((item, i) => (
                    <div key={i} className={`p-6 bg-white border rounded-2xl transition-all hover:shadow-xl ${
                      item.isExamPrep ? 'border-orange-300 shadow-orange-50 bg-orange-50/10' : 
                      item.isRevision ? 'border-green-200 shadow-green-50' : 
                      'border-slate-100 shadow-sm'
                    }`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Week {item.weekNumber}</span>
                          {item.dayNumber && <span className="text-[9px] font-bold text-slate-400 uppercase">Day {item.dayNumber}</span>}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.intensity === 'High' ? 'bg-red-100 text-red-600' : 
                            item.intensity === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-green-100 text-green-600'
                          }`}>{item.intensity} Load</span>
                          {item.isExamPrep && <span className="text-[8px] font-bold text-orange-600 mt-1 uppercase">🔥 Exam Prep</span>}
                          {item.isRevision && <span className="text-[8px] font-bold text-green-600 mt-1 uppercase">🔄 Revision</span>}
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2 text-sm leading-tight">{item.topic}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.objective}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sensei' && <SenseiChat />}
        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-12 rounded-3xl shadow-xl">
             <h2 className="text-2xl font-bold text-slate-900 mb-8">Contribute Material</h2>
             <form onSubmit={handleUpload} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material Title</label>
                  <input required name="title" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher / Faculty Name</label>
                  <input required name="teacherName" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Dr. Jane Doe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</label>
                    <input required name="subject" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                    <select name="type" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="PDF">Lecture Notes</option>
                      <option value="SYLLABUS">Syllabus</option>
                      <option value="ASSIGNMENT">Assignment</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea name="description" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm h-32" />
                </div>
                <input required name="file" type="file" accept=".pdf" className="text-sm" />
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">Submit Material</button>
             </form>
          </div>
        )}
      </div>
      {activeMaterial && <PDFWorkspace material={activeMaterial} onClose={() => setActiveMaterial(null)} />}
    </Layout>
  );
};

export default App;
