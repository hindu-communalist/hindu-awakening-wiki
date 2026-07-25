import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { quoteData, videoData } from '../data.js';

const ADMIN_IMPORT_PASSWORD = 'HinduAwakeningAdmin2026';
const SUPER_USER_PASSWORD = 'HinduAwakeningSuperUser2026';

const initialFilters = {
  quotes: { tag: ['All'], book: 'All Books', author: 'All Authors' },
  videos: { tag: ['All'] },
};

const baseButtonClasses = [
  'px-4',
  'py-2',
  'text-sm',
  'font-medium',
  'rounded-md',
  'shadow-sm',
  'focus:outline-none',
  'border',
  'border-white/20',
  'transition-colors',
];

const defaultButtonClasses = ['text-white/70', 'bg-white/10', 'hover:bg-white/20'];
const activeButtonClasses = ['text-white', 'font-semibold', 'bg-indigo-500/50', 'border-indigo-400'];

function App() {
  const [currentPage, setCurrentPage] = useState('quotes');
  const [quotes, setQuotes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState('quotes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [flippedQuoteId, setFlippedQuoteId] = useState(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const [superUserPassword, setSuperUserPassword] = useState('');
  const [superUserAuthenticated, setSuperUserAuthenticated] = useState(false);
  const [superUserStatus, setSuperUserStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ quote: '', book: '', author: '', page: '', tags: '', comments: '' });
  const [videoForm, setVideoForm] = useState({ title: '', videoId: '', tags: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [quotesSnapshot, videosSnapshot] = await Promise.all([
          getDocs(collection(db, 'quotes')),
          getDocs(collection(db, 'videos')),
        ]);

        setQuotes(
          quotesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() || {}),
          }))
        );
        setVideos(
          videosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() || {}),
          }))
        );
      } catch (error) {
        console.error('Unable to load Firestore data.', error);
        setAdminStatus('Unable to load Firestore data. Please verify the Firebase connection and rules.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const quoteTags = useMemo(() => {
    const allTags = new Set(quotes.flatMap((item) => item.tags || []));
    return ['All', ...Array.from(allTags).sort()];
  }, [quotes]);

  const bookOptions = useMemo(() => {
    const books = [...new Set(quotes.map((item) => item.book).filter(Boolean))];
    return ['All Books', ...books];
  }, [quotes]);

  const authorOptions = useMemo(() => {
    const authors = [...new Set(quotes.map((item) => item.author).filter(Boolean))];
    return ['All Authors', ...authors];
  }, [quotes]);

  const videoTags = useMemo(() => {
    const allTags = new Set(videos.flatMap((item) => item.tags || []));
    return ['All', ...Array.from(allTags).sort()];
  }, [videos]);

  const visibleQuotes = useMemo(() => {
    const search = searchTerm.toLowerCase();
    let result = [...quotes];

    if (search) {
      result = result.filter((item) => {
        const haystack = `${item.quote} ${item.book} ${item.author}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (!filters.quotes.tag.includes('All')) {
      result = result.filter((item) => item.tags?.some((tag) => filters.quotes.tag.includes(tag)));
    }

    if (filters.quotes.book !== 'All Books') {
      result = result.filter((item) => item.book === filters.quotes.book);
    }

    if (filters.quotes.author !== 'All Authors') {
      result = result.filter((item) => item.author === filters.quotes.author);
    }

    return result;
  }, [filters.quotes, quotes, searchTerm]);

  const visibleVideos = useMemo(() => {
    let result = [...videos];

    if (!filters.videos.tag.includes('All')) {
      result = result.filter((item) => item.tags?.some((tag) => filters.videos.tag.includes(tag)));
    }

    return result;
  }, [filters.videos, videos]);

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const openFilterPanel = (page) => {
    setActiveFilterPanel(page);
    setShowFilterPanel(true);
  };

  const closeFilterPanel = () => setShowFilterPanel(false);

  const toggleQuoteTag = (tag) => {
    setFilters((prev) => {
      const current = prev.quotes.tag;
      if (tag === 'All') {
        return { ...prev, quotes: { ...prev.quotes, tag: ['All'] } };
      }

      const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
      return {
        ...prev,
        quotes: { ...prev.quotes, tag: next.length ? next.filter((item) => item !== 'All') : ['All'] },
      };
    });
  };

  const toggleVideoTag = (tag) => {
    setFilters((prev) => {
      const current = prev.videos.tag;
      if (tag === 'All') {
        return { ...prev, videos: { ...prev.videos, tag: ['All'] } };
      }

      const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
      return {
        ...prev,
        videos: { ...prev.videos, tag: next.length ? next.filter((item) => item !== 'All') : ['All'] },
      };
    });
  };

  const copyQuoteToClipboard = async (item) => {
    const formattedText = `"${item.quote}"\n— ${item.author}, from '${item.book}' (Page ${item.page})`;
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopiedQuoteId(item.id);
      window.setTimeout(() => setCopiedQuoteId(null), 2000);
    } catch (error) {
      console.error('Clipboard failed', error);
    }
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchTerm('');
  };

  const handleAdminImport = async () => {
    if (adminPassword !== ADMIN_IMPORT_PASSWORD) {
      setAdminStatus('Incorrect password. Only authorized admins can import seed data.');
      return;
    }

    setImporting(true);
    setAdminStatus('Importing seed data into Firestore…');

    try {
      const quotesSnapshot = await getDocs(collection(db, 'quotes'));
      const videosSnapshot = await getDocs(collection(db, 'videos'));

      if (quotesSnapshot.empty) {
        await Promise.all(quoteData.map((item) => addDoc(collection(db, 'quotes'), item)));
      }

      if (videosSnapshot.empty) {
        await Promise.all(videoData.map((item) => addDoc(collection(db, 'videos'), item)));
      }

      const [updatedQuotesSnapshot, updatedVideosSnapshot] = await Promise.all([
        getDocs(collection(db, 'quotes')),
        getDocs(collection(db, 'videos')),
      ]);

      setQuotes(
        updatedQuotesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() || {}),
        }))
      );
      setVideos(
        updatedVideosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() || {}),
        }))
      );
      setAdminStatus('Seed data imported successfully.');
      setAdminPassword('');
    } catch (error) {
      console.error('Admin import failed.', error);
      setAdminStatus('Import failed. Please check the Firestore connection and permissions.');
    } finally {
      setImporting(false);
    }
  };

  const handleSuperUserLogin = (event) => {
    event.preventDefault();

    if (superUserPassword === SUPER_USER_PASSWORD) {
      setSuperUserAuthenticated(true);
      setSuperUserStatus('Access granted. You can now add new quotes and videos.');
      setSuperUserPassword('');
    } else {
      setSuperUserAuthenticated(false);
      setSuperUserStatus('Incorrect password.');
    }
  };

  const parseTags = (value) => value.split(',').map((tag) => tag.trim()).filter(Boolean);

  const handleQuoteSubmit = async (event) => {
    event.preventDefault();
    if (!superUserAuthenticated) return;

    setSubmitting(true);
    setSuperUserStatus('Saving quote to Firestore…');

    try {
      const payload = {
        quote: quoteForm.quote.trim(),
        book: quoteForm.book.trim(),
        author: quoteForm.author.trim(),
        page: Number(quoteForm.page) || 0,
        tags: parseTags(quoteForm.tags),
        comments: quoteForm.comments.trim(),
      };

      const docRef = await addDoc(collection(db, 'quotes'), payload);
      setQuotes((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setQuoteForm({ quote: '', book: '', author: '', page: '', tags: '', comments: '' });
      setSuperUserStatus('Quote saved to Firestore.');
    } catch (error) {
      console.error('Failed to save quote.', error);
      setSuperUserStatus('Unable to save the quote. Please verify Firestore access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVideoSubmit = async (event) => {
    event.preventDefault();
    if (!superUserAuthenticated) return;

    setSubmitting(true);
    setSuperUserStatus('Saving video to Firestore…');

    try {
      const payload = {
        title: videoForm.title.trim(),
        videoId: videoForm.videoId.trim(),
        tags: parseTags(videoForm.tags),
      };

      const docRef = await addDoc(collection(db, 'videos'), payload);
      setVideos((prev) => [{ id: docRef.id, ...payload }, ...prev]);
      setVideoForm({ title: '', videoId: '', tags: '' });
      setSuperUserStatus('Video saved to Firestore.');
    } catch (error) {
      console.error('Failed to save video.', error);
      setSuperUserStatus('Unable to save the video. Please verify Firestore access.');
    } finally {
      setSubmitting(false);
    }
  };

  const quoteFiltersActive = searchTerm || !filters.quotes.tag.includes('All') || filters.quotes.book !== 'All Books' || filters.quotes.author !== 'All Authors';
  const videoFiltersActive = !filters.videos.tag.includes('All');

  return (
    <div className="flex h-screen font-sans">
      <nav className={`fixed top-0 left-0 h-full w-[250px] flex flex-col flex-shrink-0 bg-white/10 backdrop-blur-lg border-r border-white/18 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 z-50 pt-20 px-4 pb-4 md:p-4 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[calc(100%-44px)]">
          <div className="w-10 h-10 mb-4">
            <img src="/flag.svg" alt="flag" />
          </div>
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col gap-2 mt-3">
              <button className={`nav-item rounded-md ${currentPage === 'quotes' ? 'active' : ''}`} onClick={() => { setCurrentPage('quotes'); setShowSidebar(false); }}>
                Quotes
              </button>
              <button className={`nav-item rounded-md ${currentPage === 'videos' ? 'active' : ''}`} onClick={() => { setCurrentPage('videos'); setShowSidebar(false); }}>
                Video Learning
              </button>
            </div>
            <button
              className={`nav-item rounded-md ${currentPage === 'super-user' ? 'active' : ''}`}
              onClick={() => {
                setCurrentPage('super-user');
                setShowSidebar(false);
              }}
            >
              Super User
            </button>
            <button
              className="nav-item rounded-md"
              onClick={() => {
                setCurrentPage('about');
                setShowSidebar(false);
                setShowAdminPanel(true);
              }}
            >
              Admin Import
            </button>
            <button className={`nav-item rounded-md mb-4 ${currentPage === 'about' ? 'active' : ''}`} onClick={() => { setCurrentPage('about'); setShowSidebar(false); }}>
              About
            </button>
          </div>
        </div>
      </nav>

      <div className={`fixed inset-0 bg-black/50 z-20 ${showSidebar ? '' : 'hidden'}`} onClick={toggleSidebar} />

      <div className={`fixed top-0 right-0 h-full w-[300px] bg-slate-800/80 backdrop-blur-lg z-40 transform transition-transform duration-300 ease-in-out p-6 ${showFilterPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Filters</h2>
          <button onClick={closeFilterPanel} className="p-2 rounded-full hover:bg-white/20">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-6">
          {activeFilterPanel === 'quotes' ? (
            <div>
              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {quoteTags.map((tag) => (
                    <button
                      key={tag}
                      className={[...baseButtonClasses, ...(filters.quotes.tag.includes(tag) ? activeButtonClasses : defaultButtonClasses)].join(' ')}
                      onClick={() => toggleQuoteTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white/70 mb-2">Book</h3>
                <select
                  value={filters.quotes.book}
                  onChange={(event) => setFilters((prev) => ({ ...prev, quotes: { ...prev.quotes, book: event.target.value } }))}
                  className="w-full p-2 pr-10 rounded-lg bg-white/10 text-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {bookOptions.map((book) => <option key={book} value={book}>{book}</option>)}
                </select>
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white/70 mb-2">Author</h3>
                <select
                  value={filters.quotes.author}
                  onChange={(event) => setFilters((prev) => ({ ...prev, quotes: { ...prev.quotes, author: event.target.value } }))}
                  className="w-full p-2 pr-10 rounded-lg bg-white/10 text-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {authorOptions.map((author) => <option key={author} value={author}>{author}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <div>
                <h3 className="text-sm font-semibold text-white/70 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {videoTags.map((tag) => (
                    <button
                      key={tag}
                      className={[...baseButtonClasses, ...(filters.videos.tag.includes(tag) ? activeButtonClasses : defaultButtonClasses)].join(' ')}
                      onClick={() => toggleVideoTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`fixed inset-0 bg-black/50 z-30 ${showFilterPanel ? '' : 'hidden'}`} onClick={closeFilterPanel} />

      <main className="flex-grow overflow-y-auto">
        <button onClick={toggleSidebar} className="md:hidden fixed top-6 left-6 z-40 p-2 rounded-md bg-white/10 border border-white/18 backdrop-blur-md">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <section className={currentPage === 'quotes' ? '' : 'hidden'}>
          <div className="page-header sticky top-0 z-10 py-6 px-8">
            <h1 className="text-4xl font-bold text-center mb-4">Book Quotes</h1>
            <div className="flex justify-center items-center gap-4 mb-4">
              <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search quotes, books, or authors..." className="w-full max-w-md p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-400" aria-label="Search quotes" />
              <button onClick={() => openFilterPanel('quotes')} className="p-3 rounded-lg bg-white/10 border border-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
              {quoteFiltersActive ? (
                <button onClick={clearFilters} className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-white text-sm">Clear</button>
              ) : null}
            </div>
          </div>
          {loading ? <div className="p-8 text-white">Loading quotes…</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-8 items-start">
              {visibleQuotes.map((item) => (
                <div key={item.id} className="card quote-card transition-transform duration-300 hover:scale-105" onClick={() => setFlippedQuoteId((current) => (current === item.id ? null : item.id))}>
                  <div className={`card-inner ${flippedQuoteId === item.id ? 'is-flipped' : ''}`}>
                    <div className="card-face card-front bg-white/10 text-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <button className="copy-btn p-2 rounded-full hover:bg-white/20 transition-colors" onClick={(event) => { event.stopPropagation(); copyQuoteToClipboard(item); }} title="Copy to clipboard">
                          <svg className="copy-icon h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          <svg className={`check-icon h-5 w-5 text-green-400 ${copiedQuoteId === item.id ? '' : 'hidden'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <div className="tags-container flex flex-wrap gap-1 justify-end">
                          {(item.tags || []).map((tag) => <span key={tag} className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/30">{tag}</span>)}
                        </div>
                      </div>
                      <div className="quote-container">
                        <blockquote className="text-lg italic w-full text-center">
                          <p className="quote-text">{`"${item.quote}"`}</p>
                        </blockquote>
                      </div>
                      {item.comments ? (
                        <div className="comments-section mt-4 border-t border-white/20 pt-2">
                          <p className="comments-text text-xs text-gray-400 italic">{item.comments}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="card-face card-back bg-white/10 items-center text-center">
                      <a className="book-title font-bold text-lg text-white hover:underline" href={`https://www.amazon.in/s?k=${encodeURIComponent(item.book)}`} target="_blank" rel="noopener noreferrer">{item.book}</a>
                      <a className="author-name text-base text-gray-300 hover:underline" href={`https://www.google.com/search?q=${encodeURIComponent(item.author)}`} target="_blank" rel="noopener noreferrer">{`by ${item.author}`}</a>
                      <p className="page-number mt-4 text-sm bg-white/20 text-white px-2 py-1 rounded border border-white/30">{`Page ${item.page}`}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={currentPage === 'videos' ? '' : 'hidden'}>
          <div className="page-header sticky top-0 z-10 py-6 px-8">
            <h1 className="text-4xl font-bold text-center mb-4">Video Learning</h1>
            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="w-full max-w-md"></span>
              <button onClick={() => openFilterPanel('videos')} className="p-3 rounded-lg bg-white/10 border border-white/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
              {videoFiltersActive ? (
                <button onClick={() => setFilters((prev) => ({ ...prev, videos: { tag: ['All'] } }))} className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-white text-sm">Clear</button>
              ) : null}
            </div>
          </div>
          {loading ? <div className="p-8 text-white">Loading videos…</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-8">
              {visibleVideos.map((item) => (
                <div key={item.id} className="video-card bg-white/10 rounded-lg shadow-lg overflow-hidden border border-white/18 transition-transform duration-300 hover:scale-105">
                  <div className="aspect-w-16 aspect-h-9 h-[250px]">
                    <iframe className="video-embed w-full h-full" src={`https://www.youtube.com/embed/${item.videoId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                  <div className="p-6">
                    <h3 className="video-title text-white font-bold">{item.title}</h3>
                    <div className="tags-container mt-2 flex flex-wrap gap-2">
                      {(item.tags || []).map((tag) => <span key={tag} className="inline-block bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/30">{tag}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={currentPage === 'super-user' ? 'block' : 'hidden'}>
          <div className="p-8">
            <div className="mx-auto mt-8 max-w-4xl space-y-6">
              <div className="rounded-lg border border-white/18 bg-white/10 p-8 shadow-lg backdrop-blur-lg">
                <h1 className="text-4xl font-bold text-center mb-4">Super User</h1>
                <p className="text-center text-white/80">
                  Unlock this panel with the hardcoded password to add quotes and videos directly to Firestore.
                </p>

                <form onSubmit={handleSuperUserLogin} className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="password"
                    value={superUserPassword}
                    onChange={(event) => setSuperUserPassword(event.target.value)}
                    placeholder="Super user password"
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                  />
                  <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400">
                    Unlock
                  </button>
                </form>
                {superUserStatus ? <p className="mt-3 text-sm text-white/80">{superUserStatus}</p> : null}
              </div>

              {superUserAuthenticated ? (
                <>
                  <div className="rounded-lg border border-white/18 bg-white/10 p-8 shadow-lg backdrop-blur-lg">
                    <h2 className="text-2xl font-semibold text-white">Add Quote</h2>
                    <form onSubmit={handleQuoteSubmit} className="mt-4 space-y-4">
                      <textarea
                        rows="4"
                        value={quoteForm.quote}
                        onChange={(event) => setQuoteForm((prev) => ({ ...prev, quote: event.target.value }))}
                        placeholder="Quote"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                        required
                      />
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          value={quoteForm.book}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, book: event.target.value }))}
                          placeholder="Book"
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                          required
                        />
                        <input
                          value={quoteForm.author}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, author: event.target.value }))}
                          placeholder="Author"
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                          required
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          type="number"
                          value={quoteForm.page}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, page: event.target.value }))}
                          placeholder="Page"
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                          required
                        />
                        <input
                          value={quoteForm.tags}
                          onChange={(event) => setQuoteForm((prev) => ({ ...prev, tags: event.target.value }))}
                          placeholder="Tags (comma separated)"
                          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                        />
                      </div>
                      <textarea
                        rows="3"
                        value={quoteForm.comments}
                        onChange={(event) => setQuoteForm((prev) => ({ ...prev, comments: event.target.value }))}
                        placeholder="Comments"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? 'Saving…' : 'Save Quote'}
                      </button>
                    </form>
                  </div>

                  <div className="rounded-lg border border-white/18 bg-white/10 p-8 shadow-lg backdrop-blur-lg">
                    <h2 className="text-2xl font-semibold text-white">Add Video</h2>
                    <form onSubmit={handleVideoSubmit} className="mt-4 space-y-4">
                      <input
                        value={videoForm.title}
                        onChange={(event) => setVideoForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Video title"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                        required
                      />
                      <input
                        value={videoForm.videoId}
                        onChange={(event) => setVideoForm((prev) => ({ ...prev, videoId: event.target.value }))}
                        placeholder="YouTube video ID"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                        required
                      />
                      <input
                        value={videoForm.tags}
                        onChange={(event) => setVideoForm((prev) => ({ ...prev, tags: event.target.value }))}
                        placeholder="Tags (comma separated)"
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? 'Saving…' : 'Save Video'}
                      </button>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className={currentPage === 'about' ? 'block' : 'hidden'}>
          <div className="p-8">
            <div className="max-w-2xl mx-auto mt-16 p-8 bg-white/10 rounded-lg shadow-lg border border-white/18 backdrop-blur-lg">
              <h1 className="text-4xl font-bold text-center mb-4">About This Hub</h1>
              <p className="text-white/80 text-center leading-relaxed">
                This React application preserves the original experience while sourcing content from Firestore so the collection can be managed remotely instead of from a local JavaScript file.
              </p>

              <div className="mt-8 rounded-lg border border-white/20 bg-slate-900/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">Admin Import</h2>
                  <button
                    onClick={() => setShowAdminPanel((value) => !value)}
                    className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                  >
                    {showAdminPanel ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showAdminPanel ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-white/70">
                      Enter the admin password to import the current seed data from the local source into Firestore.
                    </p>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      placeholder="Admin password"
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
                    />
                    <button
                      onClick={handleAdminImport}
                      disabled={importing}
                      className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importing ? 'Importing…' : 'Import Seed Data'}
                    </button>
                    {adminStatus ? <p className="text-sm text-white/80">{adminStatus}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
