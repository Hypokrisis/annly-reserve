// Schedule Types
export interface Schedule {
    id: string;
    barber_id: string;
    day_of_week: number; // 0=Sunday, 6=Saturday
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateScheduleData {
    barber_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
}

export interface UpdateScheduleData {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
}

export interface WeekSchedule {
    [key: number]: Schedule; // day_of_week as key
}
