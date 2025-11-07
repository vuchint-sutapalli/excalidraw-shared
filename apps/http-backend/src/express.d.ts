// This declaration file is used to extend the Express Request interface
// to include a custom 'userId' property, which is added by our auth middleware.

declare namespace Express {
	export interface Request {
		userId: string;
		email: string;
		name: string;
	}
}
