export interface SensorData {
	timestamp: string;
	value: number;
}

export interface Field {
	field_id: string;
	field_name: string;
}

export enum SensorType {
	Temperature = 0,
	Humidity = 1,
	PHLevel = 2
}

export interface Sensor {
	sensor_id: string;
	sensor_name: string;
	sensor_type: SensorType;
}

export interface Pipeline {
	id: string;
	state: string;
	start_time: Date;
}
