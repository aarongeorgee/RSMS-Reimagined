import academicCalendarSource from './academic-calendar.json'
import attendanceSource from './attendance.json'
import examinationsSource from './examinations.json'
import feedbackSource from './feedback.json'
import feesSource from './fees.json'
import marksSource from './marks.json'
import mentoringSource from './mentoring.json'
import noticesSource from './notices.json'
import profileSource from './profile.json'
import requestsSource from './requests.json'
import resourcesSource from './resources.json'
import timetableSource from './timetable.json'

const palette = ['#0b806f', '#5173be', '#ae8747', '#b76662', '#8a6ba6', '#5297a5', '#46776c', '#ad6f47', '#68788b']

const subjectCodes: Record<string, string> = {
  'Web Programming': 'WP',
  'Algorithm Analysis and Design': 'AAD',
  'Computer Networks': 'CN',
  'Database Management Systems': 'DBMS',
  'Design Thinking and Creativity': 'DT',
  'S5 Elective (CG / SPM / MML)': 'ELEC',
  'DBMS Lab': 'DBMSLAB',
  'Computer Networks Lab': 'CNLAB',
}

export const attendanceRecords = attendanceSource.records
export const attendanceSummary = attendanceSource.summary
export const marks = marksSource.marks
export const examinations = examinationsSource.examinations
export const calendarEvents = academicCalendarSource.events
export const fees = feesSource.fees
export const mentoringEntries = mentoringSource.entries
export const feedbackDestinations = feedbackSource.destinations
export const resources = resourcesSource.resources
export const timetable = timetableSource.timetable

export const profileSeed = {
  ...profileSource.profile,
  phone: '',
  bio: 'B.Tech Computer Science student · Semester 5 · Section A.',
}

export const subjects = attendanceSummary.map((entry, index) => {
  const firstMark = marks.find(
    (mark) => mark.semester === 5 && mark.subject === entry.subject && mark.component === 'Mid Term 1',
  )

  return {
    code: subjectCodes[entry.subject] ?? `S${index + 1}`,
    name: entry.subject,
    short: subjectCodes[entry.subject] ?? entry.subject,
    faculty: 'Faculty details not listed',
    held: entry.total,
    attended: entry.attended,
    missed: entry.missed,
    percentage: entry.percentage,
    mark: firstMark?.obtainedMarks ?? null,
    markMaximum: firstMark?.maxMarks ?? null,
    color: palette[index % palette.length],
  }
})

const categoryLabels: Record<string, string> = {
  exam: 'Examinations',
  academic: 'Academic',
  placement: 'Placement',
  administrative: 'Administrative',
  event: 'Events',
}

const priorityLabels: Record<string, string> = {
  urgent: 'Urgent',
  important: 'Important',
  normal: 'Update',
}

export const noticeData = noticesSource.notices.map((notice) => ({
  id: notice.id,
  category: categoryLabels[notice.category] ?? notice.category,
  date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(notice.postedAt)),
  title: notice.title,
  body: notice.body,
  tag: priorityLabels[notice.priority] ?? notice.priority,
  postedBy: notice.postedBy,
}))

const requestTypeLabels: Record<string, string> = {
  hostelRefund: 'Hostel fee refund',
  messRefund: 'Mess fee refund',
  activityPoints: 'Activity points request',
  facility: 'Facility maintenance request',
  grievance: 'Grievance',
  suggestion: 'Suggestion',
}

const requestStatusLabels: Record<string, string> = {
  resolved: 'Resolved',
  inReview: 'Under review',
  submitted: 'Submitted',
}

export const requestSeed = requestsSource.requests.map((request) => ({
  id: request.id.toUpperCase(),
  type: requestTypeLabels[request.type] ?? request.type,
  date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(request.submittedAt),
  ),
  status: requestStatusLabels[request.status] ?? request.status,
  details: request.description,
  remarks: request.remarks,
  updatedAt: request.updatedAt,
}))

export const appTypes = [
  'Hostel fee refund',
  'Mess fee refund',
  'Activity points request',
  'Facility maintenance request',
  'Grievance',
  'Suggestion',
]

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T00:00:00+05:30`),
  )
}

export function subjectByName(name: string) {
  return subjects.find((subject) => subject.name === name) ?? {
    code: name.slice(0, 3).toUpperCase(),
    name,
    short: name,
    faculty: 'Faculty details not listed',
    held: 0,
    attended: 0,
    missed: 0,
    percentage: 0,
    mark: null,
    markMaximum: null,
    color: palette[0],
  }
}
