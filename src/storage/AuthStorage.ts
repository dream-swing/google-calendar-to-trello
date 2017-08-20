export interface AuthStorage {
	getEncryptedAuth(key: string, callback: ((string) => void));
	storeEncryptedAuth(key: string, authData: any);
}