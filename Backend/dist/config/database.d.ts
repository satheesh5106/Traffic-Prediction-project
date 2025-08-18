export declare const collections: {
    users: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
    predictions: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
    routes: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
    stats: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>;
};
type CollectionName = 'users' | 'predictions' | 'routes' | 'stats' | 'routeStats';
type QueryOperator = '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'in' | 'array-contains-any';
export declare const dbHelpers: {
    create: (collection: CollectionName, data: any) => Promise<any>;
    getById: (collection: CollectionName, id: string) => Promise<{
        id: string;
    } | null>;
    update: (collection: CollectionName, id: string, data: any) => Promise<any>;
    delete: (collection: CollectionName, id: string) => Promise<{
        id: string;
    }>;
    query: (collection: CollectionName, field: string, operator: QueryOperator, value: any) => Promise<any[]>;
};
export {};
