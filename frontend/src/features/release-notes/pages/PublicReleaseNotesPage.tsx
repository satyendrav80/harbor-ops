import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicReleaseNotes } from '../../../services/releaseNotes';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { FileText, AlertCircle } from 'lucide-react';
import dayjs from '../../../utils/dayjs';
import { ExpandableContent } from '../../../components/common/ExpandableContent';

export function PublicReleaseNotesPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-release-notes', token],
    queryFn: () => getPublicReleaseNotes(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loading className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Share Link Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This share link may have expired or been deleted.
          </p>
        </div>
      </div>
    );
  }

  const { shareLink, data: releaseNotes, pagination } = data;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              Shared Release Notes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {shareLink.expiresAt
                ? `Expires: ${dayjs.utc(shareLink.expiresAt).format('D MMM YYYY, HH:mm')}`
                : 'Never expires'}
              {' • '}
              {shareLink.viewCount} view{shareLink.viewCount !== 1 ? 's' : ''}
            </p>
          </div>
        </header>

        {/* Release Notes List */}
        {releaseNotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No release notes found"
            description="No release notes match the current filters."
          />
        ) : (
          <div className="space-y-4">
            {releaseNotes.map((releaseNote) => (
              <div
                key={releaseNote.id}
                className="bg-white dark:bg-[#1C252E] border rounded-xl p-6 pt-10 relative group border-gray-200 dark:border-gray-700/50"
              >
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      releaseNote.status === 'deployed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : releaseNote.status === 'deployment_started'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {releaseNote.status === 'deployment_started' ? 'deployment started' : releaseNote.status}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 pr-24">
                    <div className="flex items-start gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words flex-1 min-w-0">
                          {releaseNote.note ? (() => {
                            const tmp = document.createElement('div');
                            tmp.innerHTML = releaseNote.note;
                            const plainText = tmp.textContent || tmp.innerText || '';
                            return plainText.length > 100 ? `${plainText.substring(0, 100)}...` : plainText;
                          })() : 'Untitled Release Note'}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-2">
                      <ExpandableContent
                        label="Content"
                        placeholder='Click "Expand" to view full content'
                        defaultExpanded={true}
                      >
                        <div className="space-y-4">
                          {releaseNote.note && (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_a]:text-primary [&_a]:hover:underline whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: releaseNote.note }}
                            />
                          )}
                          
                          {releaseNote.tasks && releaseNote.tasks.length > 0 && (
                            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Added Tasks
                              </h4>
                              {releaseNote.tasks.map((releaseNoteTask) => {
                                const task = releaseNoteTask.task;
                                const typeIcons: Record<string, string> = {
                                  bug: '🐛',
                                  feature: '✨',
                                  todo: '📝',
                                  epic: '🎯',
                                  improvement: '⚡',
                                };
                                return (
                                  <div key={task.id} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base">{typeIcons[task.type] || '📝'}</span>
                                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {task.title}
                                      </h5>
                                    </div>
                                    {task.description && (
                                      <div
                                        className="prose prose-sm dark:prose-invert max-w-none text-xs text-gray-600 dark:text-gray-400 ml-6 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_a]:text-primary [&_a]:hover:underline"
                                        dangerouslySetInnerHTML={{ __html: task.description }}
                                      />
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 ml-6">
                                      <span>
                                        Status: <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                      </span>
                                      {task.sprint && (
                                        <span>
                                          Sprint: <span className="font-medium">{task.sprint.name}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </ExpandableContent>
                    </div>

                    {releaseNote.service && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Service</p>
                        <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                          <span>☁️</span>
                          {releaseNote.service.name} (:{releaseNote.service.port})
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                      {releaseNote.publishDate && (
                        <span className="font-medium">
                          Publish Date: {dayjs.utc(releaseNote.publishDate).format('D MMM YYYY, HH:mm')}
                        </span>
                      )}
                      {releaseNote.deployedAt && (
                        <span className="font-medium text-green-700 dark:text-green-300">
                          Deployed: {dayjs.utc(releaseNote.deployedAt).format('D MMM YYYY, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
