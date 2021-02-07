// Names of properties in T with types that include undefined
type OptionalPropertyNames<T> =
    { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];

// Common properties from L and R with undefined in R[K] replaced by type in L[K]
type SpreadProperties<L, R, K extends keyof L & keyof R> =
    { [P in K]: L[P] | Exclude<R[P], undefined> };

type Id<T> = { [K in keyof T]: T[K] } // see note at bottom*

// Type of { ...L, ...R }
export type Spread<L, R> = Id<// Properties in L that don't exist in R
    & Pick<L, Exclude<keyof L, keyof R>>
    // Properties in R with types that exclude undefined
    & Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
    // Properties in R, with types that include undefined, that don't exist in L
    & Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
    // Properties in R, with types that include undefined, that exist in L
    & SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>>;

/**
 * Merges two objects into one object. When both objects have fields of the same name, then `right`
 * overwrites `left`. The code is taken directly from [jcalz](https://stackoverflow.com/a/49683575/1886883).
 * @param {A} left The first object (for example, the one holding default values)
 * @param {B} right The second object (for example, holding the override values)
 * @return {Spread<A, B>} The merged object
 */
export function mergeProperties<A extends object, B extends object>(left: A, right: B): Spread<A, B> {
    return Object.assign({}, left, right) as Spread<A, B>;
}

