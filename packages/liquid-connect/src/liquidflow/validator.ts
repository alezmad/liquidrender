// LiquidFlow - Validator
// Validates LiquidFlow IR structure

import type {
  LiquidFlow,
  FlowValidation,
  FlowValidationError,
  FlowValidationWarning,
} from './types';

/**
 * Validate a LiquidFlow IR
 */
export function validateFlow(flow: LiquidFlow): FlowValidation {
  const errors: FlowValidationError[] = [];
  const warnings: FlowValidationWarning[] = [];

  // Version check
  if (!flow.version) {
    errors.push({ path: 'version', message: 'Version is required' });
  }

  // Type check
  if (!flow.type) {
    errors.push({ path: 'type', message: 'Query type is required' });
  } else if (!['metric', 'entity'].includes(flow.type)) {
    errors.push({ path: 'type', message: 'Query type must be "metric" or "entity"' });
  }

  // Metric query validation
  if (flow.type === 'metric') {
    if (!flow.metrics || flow.metrics.length === 0) {
      errors.push({ path: 'metrics', message: 'At least one metric is required for metric queries' });
    } else {
      flow.metrics.forEach((metric, i) => {
        if (!metric.ref) {
          errors.push({ path: `metrics[${i}].ref`, message: 'Metric ref is required' });
        }
        if (!metric.expression) {
          errors.push({ path: `metrics[${i}].expression`, message: 'Metric expression is required' });
        }
        if (!metric.aggregation) {
          errors.push({ path: `metrics[${i}].aggregation`, message: 'Metric aggregation is required' });
        }
      });
    }

    // Entity should not be present in metric queries
    if (flow.entity) {
      warnings.push({ path: 'entity', message: 'Entity is ignored in metric queries' });
    }
  }

  // Entity query validation
  if (flow.type === 'entity') {
    if (!flow.entity) {
      errors.push({ path: 'entity', message: 'Entity is required for entity queries' });
    } else {
      if (!flow.entity.ref) {
        errors.push({ path: 'entity.ref', message: 'Entity ref is required' });
      }
      if (!flow.entity.table) {
        errors.push({ path: 'entity.table', message: 'Entity table is required' });
      }
    }

    // Metrics should not be present in entity queries
    if (flow.metrics && flow.metrics.length > 0) {
      warnings.push({ path: 'metrics', message: 'Metrics are ignored in entity queries' });
    }
  }

  // Dimensions validation
  if (flow.dimensions) {
    flow.dimensions.forEach((dim, i) => {
      if (!dim.ref) {
        errors.push({ path: `dimensions[${i}].ref`, message: 'Dimension ref is required' });
      }
      if (!dim.expression) {
        errors.push({ path: `dimensions[${i}].expression`, message: 'Dimension expression is required' });
      }
    });
  }

  // Filters validation
  if (flow.filters) {
    flow.filters.forEach((filter, i) => {
      validateFilter(filter, `filters[${i}]`, errors);
    });
  }

  // Time validation
  if (flow.time) {
    if (!flow.time.field) {
      errors.push({ path: 'time.field', message: 'Time field is required' });
    }
    if (!flow.time.start) {
      errors.push({ path: 'time.start', message: 'Time start is required' });
    }
    if (!flow.time.end) {
      errors.push({ path: 'time.end', message: 'Time end is required' });
    }
  }

  // OrderBy validation
  if (flow.orderBy) {
    flow.orderBy.forEach((order, i) => {
      if (!order.expression) {
        errors.push({ path: `orderBy[${i}].expression`, message: 'Order expression is required' });
      }
      if (!['asc', 'desc'].includes(order.direction)) {
        errors.push({ path: `orderBy[${i}].direction`, message: 'Order direction must be "asc" or "desc"' });
      }
    });
  }

  // Limit validation
  if (flow.limit !== undefined) {
    if (typeof flow.limit !== 'number' || flow.limit < 1) {
      errors.push({ path: 'limit', message: 'Limit must be a positive number' });
    }
  }

  // Sources validation
  if (!flow.sources || flow.sources.length === 0) {
    warnings.push({ path: 'sources', message: 'No sources defined' });
  } else {
    flow.sources.forEach((source, i) => {
      if (!source.alias) {
        errors.push({ path: `sources[${i}].alias`, message: 'Source alias is required' });
      }
      if (!source.table) {
        errors.push({ path: `sources[${i}].table`, message: 'Source table is required' });
      }
    });
  }

  // Joins validation
  if (flow.joins) {
    flow.joins.forEach((join, i) => {
      if (!join.type) {
        errors.push({ path: `joins[${i}].type`, message: 'Join type is required' });
      }
      if (!join.on) {
        errors.push({ path: `joins[${i}].on`, message: 'Join condition is required' });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateFilter(
  filter: LiquidFlow['filters'][number],
  path: string,
  errors: FlowValidationError[]
): void {
  if (!filter.type) {
    errors.push({ path: `${path}.type`, message: 'Filter type is required' });
    return;
  }

  if (filter.type === 'predicate') {
    if (!filter.field) {
      errors.push({ path: `${path}.field`, message: 'Filter field is required' });
    }
    if (!filter.operator) {
      errors.push({ path: `${path}.operator`, message: 'Filter operator is required' });
    }
    // Value can be null for null checks
  }

  if (filter.type === 'compound') {
    if (!filter.booleanOp) {
      errors.push({ path: `${path}.booleanOp`, message: 'Boolean operator is required' });
    }
    if (!filter.left) {
      errors.push({ path: `${path}.left`, message: 'Left operand is required' });
    } else {
      validateFilter(filter.left, `${path}.left`, errors);
    }
    if (!filter.right) {
      errors.push({ path: `${path}.right`, message: 'Right operand is required' });
    } else {
      validateFilter(filter.right, `${path}.right`, errors);
    }
  }
}

/**
 * Check if a LiquidFlow is valid (quick check)
 */
export function isValidFlow(flow: LiquidFlow): boolean {
  return validateFlow(flow).valid;
}
