export interface AuthStorage {
	getEncryptedAuth(key: string, callback);
	storeEncryptedAuth(key: string, authData: any);
}