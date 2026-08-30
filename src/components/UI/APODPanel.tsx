import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Image as ImageIcon, Video, AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import styles from './APODPanel.module.css';

interface APODData {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
  copyright?: string;
}

// Cache key for localStorage
const APOD_CACHE_KEY = 'apod_cache';
const APOD_CACHE_TIME_KEY = 'apod_cache_time';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function APODPanel() {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<APODData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Try to load cached APOD data
  const loadCachedAPOD = useCallback((): APODData | null => {
    try {
      const cachedTime = localStorage.getItem(APOD_CACHE_TIME_KEY);
      const cachedData = localStorage.getItem(APOD_CACHE_KEY);

      if (cachedTime && cachedData) {
        const age = Date.now() - parseInt(cachedTime, 10);
        if (age < CACHE_DURATION) {
          return JSON.parse(cachedData);
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  }, []);

  // Save APOD data to cache
  const saveToCache = useCallback((apodData: APODData) => {
    try {
      localStorage.setItem(APOD_CACHE_KEY, JSON.stringify(apodData));
      localStorage.setItem(APOD_CACHE_TIME_KEY, Date.now().toString());
    } catch {
      // Ignore cache errors
    }
  }, []);

  const fetchAPOD = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRateLimited(false);

    // First, try to show cached data immediately if available
    const cached = loadCachedAPOD();
    if (cached) {
      setData(cached);
      setLoading(false);
      // Still try to fetch fresh data in background
    }

    try {
      // Use NASA APOD API (DEMO_KEY allows 30 requests/hour, 50/day)
      // For production, you'd want to use your own API key
      const apiKey = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
      const response = await fetch(
        `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&thumbs=true`
      );

      // Handle rate limiting (429 Too Many Requests)
      if (response.status === 429) {
        setRateLimited(true);
        if (!cached) {
          setError(t('apod.rateLimited'));
        }
        // If we have cached data, keep showing it silently
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const apodData: APODData = await response.json();
      setData(apodData);
      saveToCache(apodData);
      setRateLimited(false);
    } catch (err) {
      console.error('Failed to fetch APOD:', err);
      if (!cached) {
        setError(t('apod.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t, loadCachedAPOD, saveToCache]);

  useEffect(() => {
    fetchAPOD();
  }, [fetchAPOD]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const retry = () => {
    fetchAPOD();
  };

  if (!isExpanded && !data && !error) {
    // Show collapsed state with loading indicator
    return (
      <div className={styles.panel} ref={panelRef}>
        <button
          className={styles.header}
          onClick={toggleExpand}
          aria-expanded={isExpanded}
          aria-controls="apod-content"
          type="button"
        >
          <div className={styles.headerContent}>
            <ImageIcon size={20} aria-hidden="true" />
            <span className={styles.title}>{t('apod.title')}</span>
          </div>
          <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
        </button>
        <div id="apod-content" className={styles.content} hidden>
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
            <span>{t('apod.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} ref={panelRef}>
      <button
        className={styles.header}
        onClick={toggleExpand}
        aria-expanded={isExpanded}
        aria-controls="apod-content"
        type="button"
      >
        <div className={styles.headerContent}>
          <ImageIcon size={20} aria-hidden="true" />
          <span className={styles.title}>{t('apod.title')}</span>
        </div>
        <ChevronDown
          size={18}
          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id="apod-content"
        className={`${styles.content} ${isExpanded ? styles.expanded : ''}`}
        hidden={!isExpanded}
      >
        {loading && (
          <div className={styles.loading}>
            <Loader2 size={24} className={styles.spinner} aria-hidden="true" />
            <span>{t('apod.loading')}</span>
          </div>
        )}

        {error && !rateLimited && (
          <div className={styles.error} role="alert">
            <AlertCircle size={24} aria-hidden="true" />
            <p>{error}</p>
            <button className={styles.retryButton} onClick={retry} type="button">
              {t('apod.retry')}
            </button>
          </div>
        )}

        {rateLimited && (
          <div className={styles.error} role="alert">
            <AlertCircle size={24} aria-hidden="true" />
            <p>{t('apod.rateLimited')}</p>
            <button className={styles.retryButton} onClick={retry} type="button">
              <RefreshCw size={16} aria-hidden="true" />
              <span>{t('apod.retry')}</span>
            </button>
            <p className={styles.rateLimitNote}>{t('apod.rateLimitNote')}</p>
          </div>
        )}

        {data && (
          <article className={styles.article}>
            <header className={styles.articleHeader}>
              <h3 className={styles.articleTitle}>{data.title}</h3>
              <div className={styles.articleMeta}>
                <time dateTime={data.date}>{t('apod.date')}: {data.date}</time>
                {data.copyright && (
                  <span className={styles.copyright}>
                    {t('apod.copyright')}: {data.copyright}
                  </span>
                )}
              </div>
            </header>

            <div className={styles.mediaWrapper}>
              {data.media_type === 'video' ? (
                <div className={styles.videoWrapper}>
                  <iframe
                    src={data.url}
                    title={data.title}
                    allowFullScreen
                    className={styles.video}
                    aria-label={t('apod.video')}
                  />
                </div>
              ) : (
                <div className={styles.imageWrapper}>
                  <img
                    src={data.url}
                    alt={data.title}
                    className={styles.image}
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div className={styles.explanation}>
              <h4>{t('apod.explanation')}</h4>
              <p>{data.explanation}</p>
            </div>

            <footer className={styles.footer}>
              {data.hdurl && (
                <a
                  href={data.hdurl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.hdLink}
                  aria-label={t('apod.hd')}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  <span>{t('apod.hd')}</span>
                </a>
              )}
              <a
                href={`https://apod.nasa.gov/apod/ap${data.date.replace(/-/g, '')}.html`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.nasaLink}
              >
                <ExternalLink size={16} aria-hidden="true" />
                <span>NASA APOD Archive</span>
              </a>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}