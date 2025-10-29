# Todo

- [x] Modify React Query config to prevent aggressive refetching on every page navigation.
- [x] Review the changes and their impact on performance.
- [x] Add a review section to summarize the changes.

## Review
The primary issue causing slow page transitions was the React Query configuration, which was set to refetch data on every component mount (`refetchOnMount: true`). This meant that every navigation triggered a network request, blocking rendering and making the app feel sluggish.

The solution involved changing this setting to `refetchOnMount: false`. This change leverages the caching mechanism of React Query more effectively. Now, when a user navigates to a page they have recently visited, the cached data is displayed instantly, and a background refetch is triggered only if the data is stale (older than the configured `staleTime`). This significantly improves the perceived performance and user experience of navigation.
