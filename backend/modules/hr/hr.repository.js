const { Op } = require('sequelize');
const { Department, Position, Employee, HrShift, ShiftAssignment, AttendanceRecord, LeaveRequest, PayrollEntry, PerformanceReview, TrainingCourse, EmployeeTraining, FinancialAccount, TreasuryAccount, JournalEntry, JournalLine } = require('../../core/database/models');
const includeEmployee = [{ model: Department, as: 'department', attributes: ['id','code','name'] }, { model: Position, as: 'position', attributes: ['id','code','title'] }];
async function list(model, query={}, options={}) {
  const where = options.where || {};
  if (query.search && options.searchFields) where[Op.or] = options.searchFields.map(field => ({ [field]: { [Op.like]: `%${query.search}%` } }));
  if (query.status) where.status = query.status;
  if (query.employeeId) where.employee_id = query.employeeId;
  if (query.from || query.to) where[options.dateField || 'created_at'] = { ...(query.from ? { [Op.gte]: query.from } : {}), ...(query.to ? { [Op.lte]: query.to } : {}) };
  const page=Number(query.page||1), limit=Number(query.limit||20);
  const result=await model.findAndCountAll({where,include:options.include||[],distinct:true,limit,offset:(page-1)*limit,order:[[options.orderField||'created_at','DESC']]});
  return {items:result.rows,pagination:{page,limit,totalItems:result.count,totalPages:Math.ceil(result.count/limit)}};
}
module.exports={Department,Position,Employee,HrShift,ShiftAssignment,AttendanceRecord,LeaveRequest,PayrollEntry,PerformanceReview,TrainingCourse,EmployeeTraining,FinancialAccount,TreasuryAccount,JournalEntry,JournalLine,includeEmployee,list};
