const ResponseApi = require('../../core/api/ResponseApi'); const s = require('./hr.service');
function action(fn, { created = false, message = 'عملیات انجام شد', type = 'SUCCESS' } = {}) {
    return async (req, res, next) => {
        try {
            const data = await fn(req);
            const body = { message, details: data };
            if (!created) body.type = type;
            return (created ? ResponseApi.created : ResponseApi.ok)(res, body);
        } catch (e) {
            return next(e);
        }
    }
}
const q = name => req => s[name](req.validated.query);
const b = name => req => s[name](req.validated.body, req.user.id);
module.exports = {
    listDepartments: action(q('listDepartments'), { message: 'فهرست دپارتمان‌ها دریافت شد' }), createDepartment: action(b('createDepartment'), { created: true, message: 'دپارتمان ایجاد شد' }), updateDepartment: action(req => s.updateDepartment(req.params.id, req.validated.body), { message: 'دپارتمان ویرایش شد' }), deleteDepartment: action(req => s.deleteDepartment(req.params.id), { message: 'دپارتمان حذف شد' }),
    listPositions: action(q('listPositions'), { message: 'فهرست سمت‌ها دریافت شد' }), createPosition: action(b('createPosition'), { created: true, message: 'سمت ایجاد شد' }), updatePosition: action(req => s.updatePosition(req.params.id, req.validated.body), { message: 'سمت ویرایش شد' }), deletePosition: action(req => s.deletePosition(req.params.id), { message: 'سمت حذف شد' }),
    listEmployees: action(q('listEmployees'), { message: 'فهرست کارکنان دریافت شد' }), getEmployee: action(req => s.getEmployee(req.params.id), { message: 'پرونده کارمند دریافت شد' }), createEmployee: action(b('createEmployee'), { created: true, message: 'پرونده کارمند ایجاد شد' }), updateEmployee: action(req => s.updateEmployee(req.params.id, req.validated.body), { message: 'پرونده کارمند ویرایش شد' }),
    listShifts: action(q('listShifts'), { message: 'فهرست شیفت‌ها دریافت شد' }), createShift: action(b('createShift'), { created: true, message: 'شیفت ایجاد شد' }), updateShift: action(req => s.updateShift(req.params.id, req.validated.body), { message: 'شیفت ویرایش شد' }), listAssignments: action(q('listAssignments'), { message: 'برنامه شیفت‌ها دریافت شد' }), assignShift: action(b('assignShift'), { created: true, message: 'شیفت به کارمند تخصیص یافت' }),
    listAttendance: action(q('listAttendance'), { message: 'سوابق حضور و غیاب دریافت شد' }), manualAttendance: action(b('createManualAttendance'), { created: true, message: 'حضور و غیاب ثبت شد' }), updateManualAttendance: action(req => s.updateManualAttendance(req.params.id, req.validated.body, req.user.id), { message: 'حضور و غیاب ویرایش شد' }), checkIn: action(req => s.checkIn(req.user.id), { created: true, message: 'ورود ثبت شد' }), checkOut: action(req => s.checkOut(req.user.id), { message: 'خروج ثبت شد' }),
    listLeaves: action(q('listLeaves'), { message: 'درخواست‌های مرخصی دریافت شد' }), createLeave: action(b('createLeave'), { created: true, message: 'درخواست مرخصی ثبت شد' }), reviewLeave: action(req => s.reviewLeave(req.params.id, req.validated.body, req.user.id), { message: 'درخواست مرخصی بررسی شد' }),
    listPayroll: action(q('listPayroll'), { message: 'فیش‌های حقوقی دریافت شد' }), payrollPaymentOptions: action(() => s.listPayrollPaymentOptions(), { message: 'حساب‌های قابل پرداخت دریافت شدند' }), createPayroll: action(b('createPayroll'), { created: true, message: 'فیش حقوقی ثبت شد' }), updatePayroll: action(req => s.updatePayroll(req.params.id, req.validated.body), { message: 'فیش حقوقی ویرایش شد' }), approvePayroll: action(req => s.approvePayroll(req.params.id, req.user.id), { message: 'فیش تأیید و سند حقوق ثبت شد' }), payPayroll: action(req => s.payPayroll(req.params.id, req.validated.body, req.user.id), { message: 'پرداخت انجام‌شده در دفتر ثبت شد' }),
    listReviews: action(q('listReviews'), { message: 'ارزیابی‌ها دریافت شد' }), createReview: action(b('createReview'), { created: true, message: 'ارزیابی ثبت شد' }),
    listTrainings: action(q('listTrainings'), { message: 'دوره‌های آموزشی دریافت شد' }), createTraining: action(b('createTraining'), { created: true, message: 'دوره آموزشی ایجاد شد' }), updateTraining: action(req => s.updateTraining(req.params.id, req.validated.body), { message: 'دوره آموزشی ویرایش شد' }), listEnrollments: action(q('listEnrollments'), { message: 'ثبت‌نام‌های آموزشی دریافت شد' }), enrollTraining: action(b('enrollTraining'), { created: true, message: 'کارمند در دوره ثبت‌نام شد' }), updateEnrollment: action(req => s.updateEnrollment(req.params.id, req.validated.body), { message: 'وضعیت دوره ویرایش شد' })
};
