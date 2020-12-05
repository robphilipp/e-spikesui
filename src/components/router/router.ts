/**
 * Calculates the base router path (i.e. without the path params or any path following
 * a path param) and returns it
 * @param path The router path
 * @return The base router path
 */
export function baseRouterPathFrom(path: string): string {
    if (path.indexOf('/:') > 0) {
        return path.split('/:')[0];
    }
    return path;
}
