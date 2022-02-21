export function createCollectionKey(...args: string[]) {
  return args.map(x => x.toLowerCase()).join('_');
}
