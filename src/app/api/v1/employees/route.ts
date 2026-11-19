import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApi, apiSuccess, apiError } from '@/lib/distribution-helper';
import { connectToDatabase } from '@/lib/mongodb';
import { Retailer, SalesOrder, Delivery } from '@/models/electronics-sales';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApi(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const departmentName = searchParams.get('department');
    const role = searchParams.get('role');

    const employees = await prisma.employee.findMany({
      where: {
        employmentStatus: 'ACTIVE',
        ...(departmentName ? { department: { name: { contains: departmentName, mode: 'insensitive' } } } : {}),
      },
      include: {
        department: true,
        branch: true,
        user: {
          select: { role: true, email: true, lastLoginAt: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // Augment with distribution stats from MongoDB (assigned retailers, completed deliveries, orders booked)
    const augmentedEmployees = await Promise.all(
      employees.map(async (emp) => {
        const [assignedRetailers, ordersBooked, deliveriesHandled] = await Promise.all([
          Retailer.countDocuments({ assignedEmployeeId: emp.id }),
          SalesOrder.countDocuments({ employeeId: emp.id }),
          Delivery.countDocuments({ employeeId: emp.id }),
        ]);

        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          phone: emp.phone,
          designation: emp.designation,
          department: emp.department?.name,
          branch: emp.branch?.name,
          role: emp.user?.role || 'EMPLOYEE',
          distributionStats: {
            assignedRetailers,
            ordersBooked,
            deliveriesHandled,
          },
        };
      })
    );

    return apiSuccess(augmentedEmployees);
  } catch (err: any) {
    console.error('V1 Employees GET Error:', err);
    return apiError(err.message || 'Failed to fetch employees', 500);
  }
}
