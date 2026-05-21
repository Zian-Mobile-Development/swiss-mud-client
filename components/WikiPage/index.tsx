import React from 'react';
import styles from './styles.module.css';
import {
  additionalLinks,
  getActiveEntry,
  guideLinks,
  wikiEntries,
  wikiPath,
} from './wikiData';
import { IconLabel } from '../icons/IconLabel';
import { FileText, Folder, Home, Search, Terminal } from 'lucide-react';

type WikiPageProps = {
  path: string;
};

export function WikiPage({ path }: WikiPageProps) {
  const activeEntry = getActiveEntry(path);
  const isHome = activeEntry.slug === 'getting-started';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label='Wiki navigation'>
        <a className={styles.brand} href='/wiki' aria-label='Swiss Mud Client Wiki home'>
          <span className={styles.brandMark} aria-hidden='true'>
            S
          </span>
          <span>Swiss Mud Wiki</span>
        </a>

        <div className={styles.sidebarActions}>
          <a className={styles.iconButton} href='/' aria-label='Back to client'>
            <Home size={18} aria-hidden />
          </a>
          <a className={styles.mainMenuButton} href='/'>
            <IconLabel icon={Terminal}>Client</IconLabel>
          </a>
        </div>

        <nav className={styles.navList}>
          {wikiEntries.map(item => (
            <a
              key={item.slug}
              href={wikiPath(item.slug)}
              aria-current={activeEntry.slug === item.slug ? 'page' : undefined}
            >
              {item.navType === 'folder' ? (
                <Folder size={16} className={styles.navIcon} aria-hidden />
              ) : (
                <FileText size={16} className={styles.navIcon} aria-hidden />
              )}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <Search size={16} aria-hidden />
            <input type='search' placeholder='Search...' aria-label='Search wiki' />
          </label>
        </header>

        <div className={styles.breadcrumbBar}>
          <Home size={14} aria-hidden />
          <span>/</span>
          <strong>{activeEntry.slug}</strong>
        </div>

        <main className={styles.content}>
          <section className={styles.pageTitle}>
            <h1>{activeEntry.title}</h1>
            <p>{activeEntry.subtitle}</p>
          </section>

          <article className={styles.article}>
            {activeEntry.content ?? (
              <section>
                <h2>{activeEntry.bodyTitle}</h2>
                <p>{activeEntry.body}</p>
              </section>
            )}

            {isHome && (
              <>
                <section>
                  <h3>First Guides</h3>
                  <div className={styles.linkList}>
                    {guideLinks.map(link => (
                      <a key={link.slug} href={wikiPath(link.slug)}>
                        <strong>{link.bodyTitle}</strong>
                        <span>{link.subtitle}</span>
                      </a>
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Additional Information</h3>
                  <div className={styles.infoList}>
                    {additionalLinks.map(link => (
                      <a key={link.slug} href={wikiPath(link.slug)}>
                        <strong>{link.label}</strong>
                        <span>{link.subtitle}</span>
                      </a>
                    ))}
                  </div>
                </section>
              </>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
